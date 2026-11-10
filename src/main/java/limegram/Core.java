package limegram;

import java.io.IOException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Pattern;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/** Вся бизнес-логика и хранилище LimeGram. Все публичные методы синхронизированы. */
@SuppressWarnings("unchecked")
final class Core {
    static final class Api extends RuntimeException {
        final int status;
        Api(int status, String msg) { super(msg); this.status = status; }
    }

    // ---- Настройки (переопределяются переменными окружения) ----
    static final String ADMIN_PHONE = env("LIMEGRAM_ADMIN_PHONE", "8888888888");      // +888 8888 888
    static final String ADMIN_CODE = env("LIMEGRAM_ADMIN_CODE", "8888");             // фиксированный код админа
    static final String ADMIN_PASSWORD = env("LIMEGRAM_ADMIN_PASSWORD", "PONA2109"); // облачный пароль админа
    static final boolean DEMO_SHOW_CODE = Boolean.parseBoolean(env("LIMEGRAM_DEMO_SHOW_CODE", "true"));

    static final String SYSTEM_ID = "0";
    static final String[] COLORS = {"#84cc16", "#22c55e", "#14b8a6", "#0ea5e9", "#a855f7", "#f97316", "#ef4444", "#eab308"};
    static final Pattern USERNAME = Pattern.compile("^[A-Za-z][A-Za-z0-9_]{3,31}$");
    static final String[] PREMIUM_COLORS = {"#ec4899", "#06b6d4", "#f43f5e", "#8b5cf6", "#fbbf24", "#10b981", "#64748b", "#d946ef"};
    static final SecureRandom RNG = new SecureRandom();

    static String env(String k, String d) { String v = System.getenv(k); return v == null || v.isBlank() ? d : v; }
    static long now() { return System.currentTimeMillis(); }
    static Map<String, Object> m(Object o) { return (Map<String, Object>) o; }
    static List<Object> l(Object o) { return (List<Object>) o; }
    static String s(Object o) { return o == null ? "" : o.toString(); }
    static long n(Object o) { return o instanceof Number x ? x.longValue() : 0; }
    static boolean b(Object o) { return Boolean.TRUE.equals(o); }
    static String trunc(String x, int max) { return x.length() > max ? x.substring(0, max) : x; }
    static Map<String, Object> obj(Object... kv) {
        Map<String, Object> r = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) r.put((String) kv[i], kv[i + 1]);
        return r;
    }

    private static final class Code { String code; long exp, sent; int tries; }
    private static final class Tmp { String uid; long exp; int tries; }

    private final Hub hub;
    private final Sms sms;
    private final Path file;
    private Map<String, Map<String, Object>> users = new LinkedHashMap<>();
    private Map<String, Map<String, Object>> chats = new LinkedHashMap<>();
    private Map<String, String> sessions = new HashMap<>();
    private Map<String, List<Map<String, Object>>> messages = new HashMap<>();
    private Map<String, Map<String, Object>> numbers = new LinkedHashMap<>();   // выданные +888 номера
    private final Map<String, Code> numCodes = new ConcurrentHashMap<>();
    private long seq = 1000;
    private volatile boolean dirty;
    private final DbStore db = DbStore.fromEnv();
    private volatile String dbJson;        // последний снимок, ещё не записанный во внешнюю базу
    private volatile long dbLast;
    private final Map<String, Code> codes = new HashMap<>();
    private final Map<String, Tmp> tmps = new HashMap<>();

    Core(Hub hub, Sms sms, Path file) {
        this.hub = hub;
        this.sms = sms;
        this.file = file;
        load();
        seedAdmin();
        ScheduledExecutorService sch = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "saver");
            t.setDaemon(true);
            return t;
        });
        sch.scheduleWithFixedDelay(this::save, 2, 2, TimeUnit.SECONDS);
        sch.scheduleWithFixedDelay(() -> { try { tick(); } catch (Exception e) { e.printStackTrace(); } }, 3, 3, TimeUnit.SECONDS);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> { dirty = true; save(true); }));
    }

    // ---------- Хранилище ----------
    private void dirty() { dirty = true; }

    private void load() {
        try {
            String raw = null;
            if (db != null) {
                try { raw = db.read(); if (raw != null) System.out.println("Данные восстановлены из внешней базы"); }
                catch (Exception e) { System.err.println("Не удалось прочитать внешнюю базу: " + e); }
            }
            if (raw == null && Files.exists(file)) raw = Files.readString(file);
            if (raw == null) return;
            Map<String, Object> root = m(Json.parse(raw));
            users = (Map<String, Map<String, Object>>) (Object) m(root.get("users"));
            chats = (Map<String, Map<String, Object>>) (Object) m(root.get("chats"));
            messages = (Map<String, List<Map<String, Object>>>) (Object) m(root.get("messages"));
            sessions = (Map<String, String>) (Object) m(root.get("sessions"));
            if (root.get("numbers") != null) numbers = (Map<String, Map<String, Object>>) (Object) m(root.get("numbers"));
            seq = Math.max(1000, n(root.get("seq")));
            System.out.println("Загружено: пользователей " + users.size() + ", чатов " + chats.size());
        } catch (Exception e) {
            System.err.println("Не удалось прочитать базу, начинаем с пустой: " + e);
        }
    }

    synchronized void save() { save(false); }

    /** force: записать во внешнюю базу немедленно (при остановке сервера); иначе не чаще раза в 8 секунд. */
    synchronized void save(boolean force) {
        if (dirty) {
            dirty = false;
            String json = Json.str(obj("users", users, "chats", chats, "messages", messages, "sessions", sessions, "numbers", numbers, "seq", seq));
            try {
                if (file.getParent() != null) Files.createDirectories(file.getParent());
                Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
                Files.writeString(tmp, json);
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                System.err.println("Ошибка сохранения: " + e);
                if (db == null) dirty = true;   // с внешней базой файл не критичен (на Render диск временный)
            }
            if (db != null) dbJson = json;
        }
        if (db != null && dbJson != null && (force || System.currentTimeMillis() - dbLast > 8000)) {
            try { db.write(dbJson); dbJson = null; dbLast = System.currentTimeMillis(); }
            catch (Exception e) { dbLast = System.currentTimeMillis(); System.err.println("Ошибка записи во внешнюю базу (повторю): " + e); }
        }
    }

    private void seedAdmin() {
        if (byPhone(ADMIN_PHONE) == null) {
            Map<String, Object> u = createUser(ADMIN_PHONE, "Admin", ADMIN_PASSWORD);
            u.put("username", "admin");
            dirty();
        }
    }

    // ---------- Пароли ----------
    static String hashPw(String pw, String saltHex) {
        try {
            byte[] salt = HexFormat.of().parseHex(saltHex);
            SecretKeyFactory f = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return HexFormat.of().formatHex(f.generateSecret(new PBEKeySpec(pw.toCharArray(), salt, 120_000, 256)).getEncoded());
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private void setPw(Map<String, Object> u, String pw) {
        byte[] salt = new byte[16];
        RNG.nextBytes(salt);
        String sh = HexFormat.of().formatHex(salt);
        u.put("passSalt", sh);
        u.put("passHash", hashPw(pw, sh));
    }

    private boolean checkPw(Map<String, Object> u, String pw) {
        return MessageDigest.isEqual(hashPw(pw == null ? "" : pw, s(u.get("passSalt"))).getBytes(), s(u.get("passHash")).getBytes());
    }

    private static String token() {
        byte[] b = new byte[32];
        RNG.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }

    // ---------- Пользователи ----------
    private Map<String, Object> byPhone(String phone) {
        for (Map<String, Object> u : users.values()) if (phone.equals(s(u.get("phone")))) return u;
        return null;
    }

    private boolean isAdmin(Map<String, Object> u) { return ADMIN_PHONE.equals(s(u.get("phone"))); }

    private Map<String, Object> createUser(String phone, String name, String pass) {
        String id = String.valueOf(++seq);
        Map<String, Object> u = obj("id", id, "phone", phone, "name", trunc(name, 64), "username", "", "bio", "",
                "color", COLORS[RNG.nextInt(COLORS.length)], "banned", false, "createdAt", now(), "lastSeen", now());
        if (pass != null) setPw(u, pass);
        users.put(id, u);
        Map<String, Object> saved = obj("id", "s_" + id, "type", "saved", "title", "Избранное", "members", new ArrayList<>(List.of(id)),
                "owner", id, "admins", new ArrayList<>(), "lastTs", now());
        chats.put("s_" + id, saved);
        systemMessage(u, "Добро пожаловать в LimeGram, " + name + "!\nЗдесь будут приходить коды входа и служебные уведомления. " +
                "Найдите друзей через «＋» → поиск по имени, @username или номеру телефона.");
        dirty();
        return u;
    }

    Map<String, Object> pub(Map<String, Object> u) {
        String id = s(u.get("id"));
        boolean hideSeen = "nobody".equals(priv(u, "lastSeen")), hideAbout = "nobody".equals(priv(u, "about")), hideGifts = "nobody".equals(priv(u, "gifts"));
        boolean pr = prem(u);
        return obj("id", id, "name", u.get("name"), "username", u.get("username"), "bio", hideAbout ? "" : u.get("bio"), "color", u.get("color"), "avatar", u.getOrDefault("avatar", ""),
                "online", !hideSeen && hub.isOnline(id), "lastSeen", hideSeen ? 0 : u.get("lastSeen"), "hiddenSeen", hideSeen, "isAdmin", isAdmin(u),
                "verified", b(u.get("verified")), "premium", pr, "emoji", pr ? s(u.get("emojiStatus")) : "",
                "pchannel", pchan(u),
                "gifts", hideGifts ? new ArrayList<>() : publicGifts(u));
    }

    /** Личный канал в профиле: только свой публичный канал (владелец/админ). */
    private Object pchan(Map<String, Object> u) {
        String cid = s(u.get("pchannel"));
        if (cid.isEmpty()) return null;
        Map<String, Object> c = chats.get(cid);
        String uid = s(u.get("id"));
        if (c == null || !"channel".equals(s(c.get("type"))) || s(c.get("username")).isEmpty()
                || !(uid.equals(s(c.get("owner"))) || l(c.get("admins")).contains(uid))) return null;
        return obj("id", cid, "title", c.get("title"), "username", c.get("username"), "count", l(c.get("members")).size());
    }

    private Map<String, Object> selfView(Map<String, Object> u) {
        Map<String, Object> v = pub(u);
        v.put("phone", u.get("phone"));
        v.put("hasPassword", !s(u.get("passHash")).isEmpty());
        v.put("settings", u.getOrDefault("settings", new LinkedHashMap<>()));
        v.put("stars", n(u.get("stars")));
        v.put("premiumUntil", prem(u) ? n(u.get("premiumUntil")) : 0);
        v.put("privacy", u.getOrDefault("privacy", new LinkedHashMap<>()));
        v.put("giftsAll", u.getOrDefault("gifts", new ArrayList<>()));
        v.put("starLog", u.getOrDefault("starLog", new ArrayList<>()));
        v.put("dailyAt", n(u.get("dailyAt")));
        v.put("gifts", u.getOrDefault("gifts", new ArrayList<>()));
        return v;
    }

    private Map<String, Object> user(String uid) {
        Map<String, Object> u = users.get(uid);
        if (u == null) throw new Api(404, "Пользователь не найден");
        return u;
    }

    // ---------- Авторизация ----------
    static String normPhone(String p) {
        String d = p == null ? "" : p.replaceAll("\\D", "");
        if (d.length() < 7 || d.length() > 15) throw new Api(400, "Неверный номер телефона");
        return d;
    }

    synchronized Object sendCode(String phoneRaw) {
        String phone = normPhone(phoneRaw);
        Map<String, Object> u = byPhone(phone);
        if (u != null && b(u.get("banned"))) throw new Api(403, "Аккаунт заблокирован");
        boolean admin = phone.equals(ADMIN_PHONE);
        boolean anon = phone.startsWith("888") && !admin;
        if (anon && !numbers.containsKey(phone)) throw new Api(403, "Номера +888 выдаёт только администратор. Этот номер не выдан.");
        Code old = codes.get(phone);
        if (!admin && old != null && now() - old.sent < 30_000) throw new Api(429, "Подождите 30 секунд перед повторной отправкой");
        Code c = new Code();
        c.code = admin ? ADMIN_CODE : String.format("%05d", RNG.nextInt(100000));
        c.sent = now();
        c.exp = now() + 300_000;
        codes.put(phone, c);
        String text = "LimeGram: ваш код входа " + c.code + ". Никому его не сообщайте.";
        if (u != null) systemMessage(u, text);          // как в Telegram: код ещё и в служебный чат
        if (!admin && !anon) sms.send("+" + phone, text);   // +888 — анонимные номера, SMS им не уходят
        if (anon && u == null) numCodes.put(phone, c);       // код для ещё не занятого номера видит админ
        Map<String, Object> r = obj("ok", true, "isNew", u == null, "anon", anon);
        if (DEMO_SHOW_CODE && !admin && !anon) r.put("demoCode", c.code);
        return r;
    }

    synchronized Object verify(String phoneRaw, String code, String name) {
        String phone = normPhone(phoneRaw);
        Code c = codes.get(phone);
        if (c == null || now() > c.exp) throw new Api(400, "Код истёк, запросите новый");
        if (++c.tries > 5) { codes.remove(phone); throw new Api(429, "Слишком много попыток, запросите новый код"); }
        if (!c.code.equals(code == null ? "" : code.trim())) throw new Api(400, "Неверный код");
        Map<String, Object> u = byPhone(phone);
        if (u == null) {
            if (name == null || name.isBlank()) throw new Api(400, "Введите ваше имя");
            u = createUser(phone, name.trim(), null);
            Map<String, Object> nm = numbers.get(phone);
            if (nm != null) { nm.put("userId", u.get("id")); nm.put("claimedAt", now()); numCodes.remove(phone); }
        }
        if (b(u.get("banned"))) throw new Api(403, "Аккаунт заблокирован");
        codes.remove(phone);
        if (!s(u.get("passHash")).isEmpty()) {
            Tmp t = new Tmp();
            t.uid = s(u.get("id"));
            t.exp = now() + 300_000;
            String tk = token();
            tmps.put(tk, t);
            return obj("needPassword", true, "tmp", tk);
        }
        return newSession(u);
    }

    synchronized Object password(String tmp, String pw) {
        Tmp t = tmps.get(tmp);
        if (t == null || now() > t.exp) throw new Api(400, "Сессия входа истекла, начните заново");
        if (++t.tries > 5) { tmps.remove(tmp); throw new Api(429, "Слишком много попыток"); }
        Map<String, Object> u = user(t.uid);
        if (!checkPw(u, pw)) throw new Api(403, "Неверный облачный пароль");
        tmps.remove(tmp);
        return newSession(u);
    }

    private Object newSession(Map<String, Object> u) {
        String tk = token();
        sessions.put(tk, s(u.get("id")));
        u.put("lastSeen", now());
        dirty();
        return obj("token", tk, "user", selfView(u));
    }

    synchronized Map<String, Object> auth(String token) {
        if (token == null) return null;
        String uid = sessions.get(token);
        Map<String, Object> u = uid == null ? null : users.get(uid);
        return (u == null || b(u.get("banned"))) ? null : u;
    }

    private final Map<String, Map<String, Object>> sessInfo = new HashMap<>();
    private static String sid(String tk) { return Integer.toHexString(tk.hashCode()); }
    synchronized Object setSessionLabel(String token, String label) {
        if (token != null && sessions.containsKey(token)) { Map<String, Object> i = sessInfo.computeIfAbsent(token, k -> new LinkedHashMap<>()); i.put("label", label.length() > 60 ? label.substring(0, 60) : label); i.putIfAbsent("at", now()); }
        return obj("ok", true);
    }
    synchronized Object sessionsList(String uid, String cur) {
        List<Object> out = new ArrayList<>();
        for (Map.Entry<String, String> e : sessions.entrySet()) if (uid.equals(e.getValue())) {
            Map<String, Object> i = sessInfo.getOrDefault(e.getKey(), new LinkedHashMap<>());
            out.add(obj("id", sid(e.getKey()), "label", i.getOrDefault("label", "Устройство"), "at", i.getOrDefault("at", now()), "current", e.getKey().equals(cur)));
        }
        return out;
    }
    synchronized Object sessionsEnd(String uid, String cur, String id, boolean all) {
        List<String> del = new ArrayList<>();
        for (Map.Entry<String, String> e : sessions.entrySet()) if (uid.equals(e.getValue()) && !e.getKey().equals(cur) && (all || sid(e.getKey()).equals(id))) del.add(e.getKey());
        for (String k : del) { sessions.remove(k); sessInfo.remove(k); }
        dirty();
        return obj("ok", true, "ended", del.size());
    }

    private String unameErr(String un, Object selfUser, Object selfChat) {
        if (!USERNAME.matcher(un).matches()) return "Username: 4–32 символа, латиница, цифры и _, начинается с буквы";
        if (Set.of("limegram", "support", "telegram", "joinchat", "settings").contains(un.toLowerCase())) return "Этот username уже занят";
        for (Map<String, Object> o : users.values()) if (o != selfUser && un.equalsIgnoreCase(s(o.get("username")))) return "Этот username уже занят";
        for (Map<String, Object> o : chats.values()) if (o != selfChat && un.equalsIgnoreCase(s(o.get("username")))) return "Этот username уже занят";
        return null;
    }
    private static String cleanUn(Object o) { String u = s(o).strip(); return u.startsWith("@") ? u.substring(1) : u; }
    synchronized Object usernameCheck(String uid, String name, String chatId) {
        String un = cleanUn(name);
        if (un.isEmpty()) return obj("ok", true);
        String er = chatId.isEmpty() ? unameErr(un, users.get(uid), null) : unameErr(un, null, chats.get(chatId));
        return er == null ? obj("ok", true) : obj("ok", false, "error", er);
    }
    synchronized Object publicChats(String uid, String q) {
        q = cleanUn(q).toLowerCase();
        List<Object> r = new ArrayList<>();
        if (q.length() < 2) return r;
        for (Map<String, Object> c : chats.values()) {
            String un = s(c.get("username"));
            if (un.isEmpty() || r.size() >= 10) continue;
            if (un.toLowerCase().contains(q) || s(c.get("title")).toLowerCase().contains(q))
                r.add(obj("id", c.get("id"), "type", c.get("type"), "title", c.get("title"), "username", un, "about", s(c.get("about")), "count", l(c.get("members")).size(), "joined", l(c.get("members")).contains(uid)));
        }
        return r;
    }
    synchronized Object deleteChat(String uid, String chatId) {
        Map<String, Object> chat = chatFor(uid, chatId);
        String type = s(chat.get("type"));
        if (!type.equals("group") && !type.equals("channel")) throw new Api(400, "Нельзя удалить этот чат");
        if (!uid.equals(s(chat.get("owner")))) throw new Api(403, "Удалить может только владелец");
        List<Object> mem = new ArrayList<>(l(chat.get("members")));
        chats.remove(chatId); messages.remove(chatId); dirty();
        for (Object mid : mem) hub.push(s(mid), "chat", obj("reload", true));
        return obj("ok", true);
    }

    synchronized Object logout(String token) { sessions.remove(token); dirty(); return obj("ok", true); }

    synchronized Object me(String uid) { return selfView(user(uid)); }

    synchronized Object updateMe(String uid, Map<String, Object> body) {
        Map<String, Object> u = user(uid);
        if (body.containsKey("name")) {
            String nm = s(body.get("name")).strip();
            if (nm.isEmpty() || nm.length() > 64) throw new Api(400, "Имя: от 1 до 64 символов");
            u.put("name", nm);
        }
        if (body.containsKey("username")) {
            String un = s(body.get("username")).strip();
            if (un.startsWith("@")) un = un.substring(1);
            if (!un.isEmpty()) {
                String er = unameErr(un, u, null);
                if (er != null) throw new Api(er.startsWith("Этот") ? 409 : 400, er);
            }
            u.put("username", un);
        }
        if (body.containsKey("bio")) u.put("bio", trunc(s(body.get("bio")).strip(), prem(u) ? 500 : 200));
        if (body.containsKey("pchannel")) {
            String cid = s(body.get("pchannel")).strip();
            if (cid.isEmpty()) u.remove("pchannel");
            else {
                u.put("pchannel", cid);
                if (pchan(u) == null) { u.remove("pchannel"); throw new Api(400, "Выберите свой публичный канал (с именем @username), где вы владелец или админ"); }
            }
        }
        if (body.containsKey("avatar")) {
            String avatar = s(body.get("avatar"));
            if (!avatar.isEmpty()) {
                if (!avatar.matches("^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$") || avatar.length() > 420_000)
                    throw new Api(400, "Аватар: загрузите PNG, JPEG, WebP или GIF размером до 300 КБ");
            }
            u.put("avatar", avatar);
        }
        if (body.containsKey("color") && (Arrays.asList(COLORS).contains(s(body.get("color"))) || (prem(u) && Arrays.asList(PREMIUM_COLORS).contains(s(body.get("color")))))) u.put("color", body.get("color"));
        dirty();
        Map<String, Object> pv = pub(u);
        hub.push(uid, "user", pv);
        for (String c : contactsOf(uid)) hub.push(c, "user", pv);
        return selfView(u);
    }

    synchronized Object changePassword(String uid, String old, String neu) {
        Map<String, Object> u = user(uid);
        if (!s(u.get("passHash")).isEmpty() && !checkPw(u, old)) throw new Api(403, "Неверный текущий облачный пароль");
        if (neu == null || neu.isEmpty()) { u.remove("passHash"); u.remove("passSalt"); }
        else {
            if (neu.length() < 6) throw new Api(400, "Облачный пароль: минимум 6 символов");
            setPw(u, neu);
        }
        dirty();
        return obj("ok", true, "hasPassword", !s(u.get("passHash")).isEmpty());
    }

    // ---------- Присутствие ----------
    private Set<String> contactsOf(String uid) {
        Set<String> r = new HashSet<>();
        for (Map<String, Object> c : chats.values()) {
            List<Object> mem = l(c.get("members"));
            if (mem.contains(uid)) for (Object o : mem) r.add(s(o));
        }
        r.remove(uid);
        return r;
    }

    synchronized void presence(String uid, boolean online) {
        Map<String, Object> u = users.get(uid);
        if (u == null) return;
        if (!online) { u.put("lastSeen", now()); dirty(); }
        boolean hide = "nobody".equals(priv(u, "lastSeen"));
        Map<String, Object> ev = obj("userId", uid, "online", !hide && online, "lastSeen", hide ? 0 : n(u.get("lastSeen")));
        for (String c : contactsOf(uid)) hub.push(c, "presence", ev);
    }

    // ---------- Чаты ----------
    private Map<String, Object> chatFor(String uid, String chatId) {
        Map<String, Object> c = chats.get(chatId);
        if (c == null || !l(c.get("members")).contains(uid)) throw new Api(404, "Чат не найден");
        return c;
    }

    private Map<String, Object> findMsg(String chatId, String id) {
        for (Map<String, Object> mm : messages.getOrDefault(chatId, List.of())) if (id.equals(s(mm.get("id")))) return mm;
        return null;
    }

    private static boolean hiddenFor(Map<String, Object> msg, String uid) {
        return msg.get("hidden") instanceof List<?> h && h.contains(uid);
    }

    /** Вид опроса для конкретного пользователя: у анонимных опросов список проголосовавших не отдаётся. */
    private Map<String, Object> pollView(Map<String, Object> poll, String uid) {
        boolean anon = b(poll.get("anon"));
        Set<Object> all = new HashSet<>();
        List<Object> opts = new ArrayList<>();
        for (Object o : l(poll.get("opts"))) {
            Map<String, Object> op = m(o);
            List<Object> v = l(op.get("v"));
            all.addAll(v);
            Map<String, Object> ov = obj("t", op.get("t"), "n", v.size(), "mine", v.contains(uid));
            if (!anon) ov.put("voters", new ArrayList<>(v.subList(0, Math.min(v.size(), 20))));
            opts.add(ov);
        }
        return obj("q", poll.get("q"), "multi", b(poll.get("multi")), "anon", anon, "closed", b(poll.get("closed")), "total", all.size(), "opts", opts);
    }

    /** Копия сообщения, подготовленная для конкретного получателя. */
    private Map<String, Object> forUser(Map<String, Object> msg, String uid) {
        if (!(msg.get("poll") instanceof Map<?, ?> pm)) return msg;
        Map<String, Object> c = new LinkedHashMap<>(msg);
        c.put("poll", pollView(m(pm), uid));
        c.remove("hidden");
        return c;
    }

    private Map<String, Object> lastView(Map<String, Object> msg) {
        Map<String, Object> c = new LinkedHashMap<>(msg);
        c.remove("hidden");
        if (msg.get("poll") instanceof Map<?, ?> pm) c.put("poll", obj("q", m(pm).get("q")));
        if (msg.get("attach") != null) c.put("attach", obj("name", m(msg.get("attach")).get("name"), "type", m(msg.get("attach")).get("type")));
        return c;
    }

    private Map<String, Object> chatView(Map<String, Object> chat, String me) {
        String cid = s(chat.get("id"));
        List<Map<String, Object>> ms = new ArrayList<>();
        for (Map<String, Object> x : messages.getOrDefault(cid, List.of())) if (!hiddenFor(x, me)) ms.add(x);
        int unread = 0, mentions = 0;
        String myName = s(users.get(me).get("username")).toLowerCase();
        Pattern mp = myName.isEmpty() ? null : Pattern.compile("(?<![\\w])@" + Pattern.quote(myName) + "(?![\\w])", Pattern.CASE_INSENSITIVE);
        for (Map<String, Object> x : ms) if (!me.equals(s(x.get("from"))) && !l(x.get("readBy")).contains(me)) {
            unread++;
            if (mp != null && mp.matcher(s(x.get("text"))).find()) mentions++;
        }
        Map<String, Object> v = obj("id", cid, "type", chat.get("type"), "title", chat.get("title"), "owner", chat.get("owner"),
                "admins", chat.get("admins"), "unread", unread, "mentions", mentions, "lastTs", chat.get("lastTs"), "pinned", chat.get("pinned"),
                "about", chat.get("about"), "ttl", n(chat.get("ttl")), "prefs", prefsOf(me).getOrDefault(cid, new LinkedHashMap<>()),
                "last", ms.isEmpty() ? null : lastView(ms.get(ms.size() - 1)));
        List<Object> mu = new ArrayList<>();
        for (Object mid : l(chat.get("members"))) {
            Map<String, Object> u = users.get(s(mid));
            if (u != null && mu.size() < 300) mu.add(pub(u));
            if (u != null && s(chat.get("type")).equals("private") && !mid.equals(me)) {
                v.put("peer", pub(u));
                v.put("blocked", l(users.get(me).getOrDefault("blocked", new ArrayList<>())).contains(s(mid)));
            }
        }
        v.put("members", mu);
        v.put("username", s(chat.get("username")));
        return v;
    }

    private Map<String, Object> prefsOf(String uid) {
        Map<String, Object> u = users.get(uid);
        Object p = u.get("prefs");
        if (p == null) { p = new LinkedHashMap<String, Object>(); u.put("prefs", p); }
        return m(p);
    }

    synchronized Object chatList(String uid) {
        List<Map<String, Object>> r = new ArrayList<>();
        for (Map<String, Object> c : chats.values()) if (l(c.get("members")).contains(uid)) r.add(chatView(c, uid));
        r.sort((a, c) -> Long.compare(n(c.get("lastTs")), n(a.get("lastTs"))));
        return r;
    }

    synchronized Object search(String uid, String q) {
        q = q.strip().toLowerCase();
        if (q.startsWith("@")) q = q.substring(1);
        String digits = q.replaceAll("\\D", "");
        List<Object> r = new ArrayList<>();
        if (q.length() < 2) return r;
        for (Map<String, Object> u : users.values()) {
            if (s(u.get("id")).equals(uid) || b(u.get("banned"))) continue;
            boolean hit = s(u.get("name")).toLowerCase().contains(q) || (!s(u.get("username")).isEmpty() && s(u.get("username")).toLowerCase().contains(q))
                    || (digits.length() >= 5 && digits.equals(s(u.get("phone"))) && !"nobody".equals(priv(u, "phoneSearch")));
            if (hit && r.size() < 20) r.add(pub(u));
        }
        return r;
    }

    synchronized Object openPrivate(String uid, String otherId) {
        if (uid.equals(otherId)) throw new Api(400, "Для заметок есть чат «Избранное»");
        Map<String, Object> o = user(otherId);
        if (b(o.get("banned"))) throw new Api(403, "Пользователь недоступен");
        long a = Long.parseLong(uid), c = Long.parseLong(otherId);
        String id = "p_" + Math.min(a, c) + "_" + Math.max(a, c);
        Map<String, Object> chat = chats.get(id);
        if (chat == null) {
            chat = obj("id", id, "type", "private", "title", "", "members", new ArrayList<>(List.of(uid, otherId)), "owner", uid,
                    "admins", new ArrayList<>(), "lastTs", now());
            chats.put(id, chat);
            dirty();
            hub.push(otherId, "chat", obj("id", id));
        }
        return chatView(chat, uid);
    }

    synchronized Object createChat(String uid, Map<String, Object> body) {
        String type = s(body.get("type"));
        if (!type.equals("group") && !type.equals("channel")) throw new Api(400, "Неверный тип чата");
        String title = s(body.get("title")).strip();
        if (title.isEmpty() || title.length() > 64) throw new Api(400, "Название: от 1 до 64 символов");
        String cun = cleanUn(body.get("username"));
        if (!cun.isEmpty()) { String er = unameErr(cun, null, null); if (er != null) throw new Api(er.startsWith("Этот") ? 409 : 400, er); }
        List<Object> mem = new ArrayList<>(List.of(uid));
        if (body.get("members") instanceof List<?> ml)
            for (Object o : ml) if (users.containsKey(s(o)) && !mem.contains(s(o)) && mem.size() < 1000) mem.add(s(o));
        String id = "g" + (++seq);
        Map<String, Object> chat = obj("id", id, "type", type, "title", title, "members", mem, "owner", uid,
                "admins", new ArrayList<>(List.of(uid)), "lastTs", now());
        if (!cun.isEmpty()) chat.put("username", cun);
        chats.put(id, chat);
        dirty();
        addMessage(chat, uid, type.equals("channel") ? "Канал «" + title + "» создан" : "Группа «" + title + "» создана", null, null);
        return chatView(chat, uid);
    }

    // ---------- Сообщения ----------
    private Map<String, Object> addMessage(Map<String, Object> chat, String from, String text, String replyTo, Map<String, Object> attach) {
        return addMessage(chat, from, text, replyTo, attach, null);
    }

    private Map<String, Object> addMessage(Map<String, Object> chat, String from, String text, String replyTo, Map<String, Object> attach, Map<String, Object> fwd) {
        return addMessage(chat, from, text, replyTo, attach, fwd, null);
    }

    private Map<String, Object> addMessage(Map<String, Object> chat, String from, String text, String replyTo, Map<String, Object> attach, Map<String, Object> fwd, Map<String, Object> poll) {
        return addMessage(chat, from, text, replyTo, attach, fwd, poll, null);
    }

    /** extra: дополнительные поля сообщения (например, "gift" для карточки подарка). */
    private Map<String, Object> addMessage(Map<String, Object> chat, String from, String text, String replyTo, Map<String, Object> attach, Map<String, Object> fwd, Map<String, Object> poll, Map<String, Object> extra) {
        String id = String.valueOf(++seq);
        String cid = s(chat.get("id"));
        Map<String, Object> msg = obj("id", id, "chatId", cid, "from", from, "text", text, "ts", now(), "replyTo", replyTo,
                "edited", false, "attach", attach, "readBy", new ArrayList<>(), "reactions", new LinkedHashMap<String, Object>(), "fwd", fwd, "poll", poll);
        if (extra != null) msg.putAll(extra);
        long ttl = n(chat.get("ttl"));
        if (ttl > 0 && !s(chat.get("type")).equals("service")) msg.put("expires", now() + ttl * 1000);
        Integer dmax = poll == null && attach == null ? DICE.get(s(text).strip()) : null;
        if (dmax != null) msg.put("dice", 1 + RNG.nextInt(dmax));
        messages.computeIfAbsent(cid, k -> new ArrayList<>()).add(msg);
        chat.put("lastTs", msg.get("ts"));
        dirty();
        for (Object mid : l(chat.get("members"))) hub.push(s(mid), "message", forUser(msg, s(mid)));
        return forUser(msg, from);
    }

    private void systemMessage(Map<String, Object> u, String text) {
        String id = "svc_" + u.get("id");
        Map<String, Object> c = chats.get(id);
        if (c == null) {
            c = obj("id", id, "type", "service", "title", "LimeGram", "members", new ArrayList<>(List.of(s(u.get("id")))),
                    "owner", SYSTEM_ID, "admins", new ArrayList<>(), "lastTs", now());
            chats.put(id, c);
        }
        addMessage(c, SYSTEM_ID, text, null, null);
    }

    synchronized Object messages(String uid, String chatId, String before) {
        chatFor(uid, chatId);
        List<Map<String, Object>> all = messages.getOrDefault(chatId, List.of());
        long bf = before == null || before.isEmpty() ? Long.MAX_VALUE : Long.parseLong(before);
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = all.size() - 1; i >= 0 && out.size() < 50; i--)
            if (Long.parseLong(s(all.get(i).get("id"))) < bf && !hiddenFor(all.get(i), uid)) out.add(forUser(all.get(i), uid));
        Collections.reverse(out);
        return obj("messages", out, "hasMore", out.size() == 50);
    }

    synchronized Object send(String uid, Map<String, Object> body) {
        Map<String, Object> chat = chatFor(uid, s(body.get("chatId")));
        String cid = s(chat.get("id")), type = s(chat.get("type"));
        if (type.equals("service")) throw new Api(403, "В этот чат нельзя писать");
        if (type.equals("channel") && !l(chat.get("admins")).contains(uid)) throw new Api(403, "В канале пишут только администраторы");
        if (type.equals("private")) {
            for (Object mid : l(chat.get("members"))) {
                if (mid.equals(uid)) continue;
                Map<String, Object> peer = user(s(mid));
                if (l(user(uid).getOrDefault("blocked", new ArrayList<>())).contains(s(mid))) throw new Api(403, "Вы заблокировали этого пользователя. Разблокируйте его, чтобы писать.");
                if (l(peer.getOrDefault("blocked", new ArrayList<>())).contains(uid)) throw new Api(403, "Пользователь ограничил получение сообщений от вас");
            }
        }
        Map<String, Object> poll = null;
        if (body.get("poll") instanceof Map<?, ?> pm0) {
            if (type.equals("saved")) throw new Api(400, "Опрос нельзя отправить в «Избранное»");
            Map<String, Object> pm = m(pm0);
            String q = s(pm.get("q")).strip();
            if (q.isEmpty() || q.length() > 255) throw new Api(400, "Вопрос опроса: от 1 до 255 символов");
            List<Object> opts = new ArrayList<>();
            if (pm.get("opts") instanceof List<?> ol) for (Object o : ol) {
                String t = s(o).strip();
                if (!t.isEmpty()) opts.add(obj("t", trunc(t, 100), "v", new ArrayList<>()));
            }
            if (opts.size() < 2 || opts.size() > 10) throw new Api(400, "В опросе должно быть от 2 до 10 вариантов");
            poll = obj("q", q, "multi", b(pm.get("multi")), "anon", b(pm.get("anon")), "closed", false, "opts", opts);
        }
        String text = s(body.get("text")).strip();
        if (text.length() > 4000) throw new Api(400, "Сообщение слишком длинное (макс. 4000 символов)");
        Map<String, Object> attach = null;
        if (body.get("attach") instanceof Map<?, ?> am0) {
            Map<String, Object> am = m(am0);
            String data = s(am.get("data"));
            if (!data.startsWith("data:") || data.length() > (prem(user(uid)) ? 7_400_000 : 4_300_000)) throw new Api(400, "Файл слишком большой (макс. " + (prem(user(uid)) ? "5" : "3") + " МБ" + (prem(user(uid)) ? "" : ", с LimeGram Premium — 5 МБ") + ")");
            attach = obj("name", trunc(s(am.get("name")), 120), "type", trunc(s(am.get("type")), 80), "data", data, "dur", n(am.get("dur")));
        }
        if (text.isEmpty() && attach == null && poll == null) throw new Api(400, "Пустое сообщение");
        String reply = s(body.get("replyTo"));
        if (reply.isEmpty() || findMsg(cid, reply) == null) reply = null;
        Map<String, Object> fwd = null;
        if (body.get("fwd") instanceof Map<?, ?> f0) {
            Map<String, Object> f = m(f0);
            fwd = obj("name", trunc(s(f.get("name")), 64), "from", trunc(s(f.get("from")), 20));
        }
        return addMessage(chat, uid, text, reply, attach, fwd, poll);
    }

    synchronized Object vote(String uid, Map<String, Object> body) {
        String cid = s(body.get("chatId"));
        Map<String, Object> chat = chatFor(uid, cid);
        Map<String, Object> msg = findMsg(cid, s(body.get("id")));
        if (msg == null || !(msg.get("poll") instanceof Map<?, ?> pm0)) throw new Api(404, "Опрос не найден");
        Map<String, Object> poll = m(pm0);
        if (b(poll.get("closed"))) throw new Api(400, "Опрос завершён");
        List<Object> opts = l(poll.get("opts"));
        Set<Integer> pick = new LinkedHashSet<>();
        if (body.get("options") instanceof List<?> ol) for (Object o : ol) {
            int i = (int) n(o);
            if (i >= 0 && i < opts.size()) pick.add(i);
        }
        if (!b(poll.get("multi")) && pick.size() > 1) pick = new LinkedHashSet<>(List.of(pick.iterator().next()));
        for (Object o : opts) l(m(o).get("v")).remove(uid);
        for (int i : pick) l(m(opts.get(i)).get("v")).add(uid);
        dirty();
        for (Object mid : l(chat.get("members")))
            hub.push(s(mid), "poll", obj("chatId", cid, "id", msg.get("id"), "poll", pollView(poll, s(mid))));
        return obj("ok", true);
    }

    synchronized Object closePoll(String uid, Map<String, Object> body) {
        String cid = s(body.get("chatId"));
        Map<String, Object> chat = chatFor(uid, cid);
        Map<String, Object> msg = findMsg(cid, s(body.get("id")));
        if (msg == null || !(msg.get("poll") instanceof Map<?, ?> pm0)) throw new Api(404, "Опрос не найден");
        if (!uid.equals(s(msg.get("from"))) && !l(chat.get("admins")).contains(uid)) throw new Api(403, "Завершить опрос может его автор");
        Map<String, Object> poll = m(pm0);
        poll.put("closed", true);
        dirty();
        for (Object mid : l(chat.get("members")))
            hub.push(s(mid), "poll", obj("chatId", cid, "id", msg.get("id"), "poll", pollView(poll, s(mid))));
        return obj("ok", true);
    }

    synchronized Object edit(String uid, Map<String, Object> body) {
        String cid = s(body.get("chatId"));
        Map<String, Object> chat = chatFor(uid, cid);
        Map<String, Object> msg = findMsg(cid, s(body.get("id")));
        if (msg == null) throw new Api(404, "Сообщение не найдено");
        if (!uid.equals(s(msg.get("from")))) throw new Api(403, "Можно редактировать только свои сообщения");
        String text = s(body.get("text")).strip();
        if (text.length() > 4000) throw new Api(400, "Сообщение слишком длинное");
        if (text.isEmpty() && msg.get("attach") == null) throw new Api(400, "Пустое сообщение");
        msg.put("text", text);
        msg.put("edited", true);
        dirty();
        Map<String, Object> ev = obj("id", msg.get("id"), "chatId", cid, "text", text, "edited", true);
        for (Object mid : l(chat.get("members"))) hub.push(s(mid), "message_edit", ev);
        return obj("ok", true);
    }

    synchronized Object delete(String uid, Map<String, Object> body) {
        String cid = s(body.get("chatId")), id = s(body.get("id"));
        Map<String, Object> chat = chatFor(uid, cid);
        Map<String, Object> msg = findMsg(cid, id);
        if (msg == null) throw new Api(404, "Сообщение не найдено");
        if (b(body.get("forMe"))) {   // «удалить у меня»: сообщение пропадает только у этого пользователя
            if (!(msg.get("hidden") instanceof List<?>)) msg.put("hidden", new ArrayList<Object>());
            if (!l(msg.get("hidden")).contains(uid)) l(msg.get("hidden")).add(uid);
            dirty();
            hub.push(uid, "message_delete", obj("id", id, "chatId", cid));
            return obj("ok", true);
        }
        boolean allowed = uid.equals(s(msg.get("from"))) || l(chat.get("admins")).contains(uid) || isAdmin(user(uid));
        if (!allowed) throw new Api(403, "Нет прав на удаление");
        messages.get(cid).remove(msg);
        dirty();
        Map<String, Object> ev = obj("id", id, "chatId", cid);
        for (Object mid : l(chat.get("members"))) hub.push(s(mid), "message_delete", ev);
        return obj("ok", true);
    }

    synchronized Object read(String uid, String chatId) {
        Map<String, Object> chat = chatFor(uid, chatId);
        boolean changed = false;
        if (prefsOf(uid).get(chatId) instanceof Map<?, ?> pp && b(m(pp).get("unreadMark"))) {
            m(pp).put("unreadMark", false); changed = true;
            hub.push(uid, "chat", obj("reload", true));
        }
        for (Map<String, Object> msg : messages.getOrDefault(chatId, List.of())) {
            if (uid.equals(s(msg.get("from")))) continue;
            List<Object> rb = l(msg.get("readBy"));
            if (!rb.contains(uid)) { rb.add(uid); changed = true; }
        }
        if (changed) {
            dirty();
            Map<String, Object> ev = obj("chatId", chatId, "userId", uid);
            for (Object mid : l(chat.get("members"))) hub.push(s(mid), "read", ev);
        }
        return obj("ok", true);
    }

    synchronized Object typing(String uid, String chatId) {
        Map<String, Object> chat = chatFor(uid, chatId);
        Map<String, Object> ev = obj("chatId", chatId, "userId", uid);
        for (Object mid : l(chat.get("members"))) if (!uid.equals(mid)) hub.push(s(mid), "typing", ev);
        return obj("ok", true);
    }


    // ---------- Реакции, закрепы, настройки чатов ----------
    synchronized Object react(String uid, Map<String, Object> body) {
        String cid = s(body.get("chatId"));
        Map<String, Object> chat = chatFor(uid, cid);
        Map<String, Object> msg = findMsg(cid, s(body.get("id")));
        if (msg == null) throw new Api(404, "Сообщение не найдено");
        String emoji = s(body.get("emoji"));
        if (emoji.length() > 8) throw new Api(400, "Неверная реакция");
        Map<String, Object> rx = msg.get("reactions") == null ? new LinkedHashMap<>() : m(msg.get("reactions"));
        msg.put("reactions", rx);
        for (Iterator<Map.Entry<String, Object>> it = rx.entrySet().iterator(); it.hasNext(); ) {   // одна реакция от человека
            Map.Entry<String, Object> e = it.next();
            List<Object> who = l(e.getValue());
            who.remove(uid);
            if (who.isEmpty()) it.remove();
        }
        if (!emoji.isEmpty() && !b(body.get("remove"))) l(rx.computeIfAbsent(emoji, k -> new ArrayList<Object>())).add(uid);
        dirty();
        Map<String, Object> ev = obj("id", msg.get("id"), "chatId", cid, "reactions", rx);
        for (Object mid : l(chat.get("members"))) hub.push(s(mid), "reaction", ev);
        return obj("ok", true);
    }

    synchronized Object pin(String uid, Map<String, Object> body) {
        String cid = s(body.get("chatId"));
        Map<String, Object> chat = chatFor(uid, cid);
        String type = s(chat.get("type"));
        if ((type.equals("group") || type.equals("channel")) && !l(chat.get("admins")).contains(uid)) throw new Api(403, "Закреплять могут только администраторы");
        String id = s(body.get("id"));
        if (!id.isEmpty() && findMsg(cid, id) == null) throw new Api(404, "Сообщение не найдено");
        if (id.isEmpty()) chat.remove("pinned"); else chat.put("pinned", id);
        dirty();
        Map<String, Object> ev = obj("chatId", cid, "pinned", id.isEmpty() ? null : id);
        for (Object mid : l(chat.get("members"))) hub.push(s(mid), "pin", ev);
        return obj("ok", true);
    }

    /** Персональные настройки чата: pinned (закреп в списке), muted, archived. */
    synchronized Object chatPrefs(String uid, Map<String, Object> body) {
        String cid = s(body.get("chatId"));
        chatFor(uid, cid);
        Map<String, Object> all = prefsOf(uid);
        Map<String, Object> p = all.get(cid) == null ? new LinkedHashMap<>() : m(all.get(cid));
        for (String k : new String[]{"pinned", "muted", "archived", "unreadMark"}) if (body.containsKey(k)) p.put(k, b(body.get(k)));
        all.put(cid, p);
        dirty();
        hub.push(uid, "chat", obj("reload", true));
        return obj("ok", true);
    }

    synchronized Object saveSettings(String uid, Map<String, Object> body) {
        Map<String, Object> u = user(uid);
        Map<String, Object> st = u.get("settings") == null ? new LinkedHashMap<>() : m(u.get("settings"));
        for (String k : new String[]{"theme", "accent", "bg", "fontSize", "sounds", "notify", "bigEmoji", "anim", "zoom", "zoomDef", "sendMode",
                "tsty", "font", "wall", "sysAccent", "autoEmoji", "wideAlign", "quick", "notifAll", "trayAnim", "volume", "notifName", "notifText",
                "nfPriv", "nfGroup", "nfChan", "nfReact", "evJoin", "evPin", "askPath", "auPriv", "auGroup", "auChan", "winChat", "winAcc", "winCnt", "winFrame",
                "trayIcon", "taskIcon", "monoIcon", "autostart", "restoreWin", "sendTo", "callDev", "callRecv",
                "st1", "st2", "em1", "em2", "em3", "em4", "ch1", "ch2", "ch3", "calls"})
            if (body.containsKey(k)) st.put(k, trunc(s(body.get(k)), 24));
        u.put("settings", st);
        dirty();
        return obj("ok", true);
    }

    synchronized Object userInfo(String uid, String target) {
        Map<String, Object> u = user(target);
        Map<String, Object> v = pub(u);
        return v;
    }

    synchronized Object searchMessages(String uid, String chatId, String q) {
        chatFor(uid, chatId);
        q = q.strip().toLowerCase();
        List<Object> r = new ArrayList<>();
        if (q.length() < 2) return r;
        List<Map<String, Object>> all = messages.getOrDefault(chatId, List.of());
        for (int i = all.size() - 1; i >= 0 && r.size() < 40; i--)
            if (!hiddenFor(all.get(i), uid) && s(all.get(i).get("text")).toLowerCase().contains(q)) r.add(lastView(all.get(i)));
        return r;
    }

    // ---------- Управление группами и каналами ----------
    synchronized Object chatEdit(String uid, Map<String, Object> body) {
        Map<String, Object> chat = chatFor(uid, s(body.get("chatId")));
        String type = s(chat.get("type"));
        if (!type.equals("group") && !type.equals("channel")) throw new Api(400, "Нельзя изменить этот чат");
        if (!l(chat.get("admins")).contains(uid)) throw new Api(403, "Только для администраторов");
        if (body.containsKey("title")) {
            String t = s(body.get("title")).strip();
            if (t.isEmpty() || t.length() > 64) throw new Api(400, "Название: от 1 до 64 символов");
            chat.put("title", t);
        }
        if (body.containsKey("about")) chat.put("about", trunc(s(body.get("about")).strip(), 200));
        if (body.containsKey("username")) {
            if (!uid.equals(s(chat.get("owner")))) throw new Api(403, "Username может менять только владелец");
            String un = cleanUn(body.get("username"));
            if (!un.isEmpty()) { String er = unameErr(un, null, chat); if (er != null) throw new Api(er.startsWith("Этот") ? 409 : 400, er); }
            chat.put("username", un);
        }
        dirty();
        for (Object mid : l(chat.get("members"))) hub.push(s(mid), "chat", obj("reload", true));
        return obj("ok", true);
    }

    /** Очистить историю только у себя. */
    synchronized Object clearHistory(String uid, String chatId) {
        chatFor(uid, chatId);
        for (Map<String, Object> msg : messages.getOrDefault(chatId, List.of())) {
            if (!(msg.get("hidden") instanceof List<?>)) msg.put("hidden", new ArrayList<Object>());
            if (!l(msg.get("hidden")).contains(uid)) l(msg.get("hidden")).add(uid);
        }
        dirty();
        hub.push(uid, "chat", obj("reload", true, "cleared", chatId));
        return obj("ok", true);
    }

    synchronized Object block(String uid, String target, boolean blocked) {
        if (uid.equals(target)) throw new Api(400, "Нельзя заблокировать себя");
        Map<String, Object> t = user(target);
        if (isAdmin(t)) throw new Api(400, "Администратора заблокировать нельзя");
        Map<String, Object> me = user(uid);
        if (!(me.get("blocked") instanceof List<?>)) me.put("blocked", new ArrayList<Object>());
        List<Object> bl = l(me.get("blocked"));
        if (blocked) { if (!bl.contains(target)) bl.add(target); } else bl.remove(target);
        dirty();
        hub.push(uid, "chat", obj("reload", true));
        return obj("ok", true, "blocked", blocked);
    }

    private static String newInvite() {
        String a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 12; i++) sb.append(a.charAt(r.nextInt(a.length())));
        return sb.toString();
    }

    synchronized Object invite(String uid, Map<String, Object> body) {
        Map<String, Object> chat = chatFor(uid, s(body.get("chatId")));
        String type = s(chat.get("type"));
        if (!type.equals("group") && !type.equals("channel")) throw new Api(400, "Ссылки есть только у групп и каналов");
        if (!l(chat.get("admins")).contains(uid)) throw new Api(403, "Только для администраторов");
        if (s(chat.get("invite")).isEmpty() || s(body.get("action")).equals("revoke")) { chat.put("invite", newInvite()); dirty(); }
        String pun = s(chat.get("username"));
        return obj("code", chat.get("invite"), "link", pun.isEmpty() ? "limegram://join/" + chat.get("invite") : "limegram://u/" + pun, "username", pun);
    }

    synchronized Object join(String uid, String code) {
        code = code.strip();
        if (code.startsWith("@") || code.contains("/u/")) {
            String un = code.substring(code.lastIndexOf(code.startsWith("@") ? '@' : '/') + 1);
            for (Map<String, Object> chat : chats.values()) {
                if (!un.equalsIgnoreCase(s(chat.get("username")))) continue;
                List<Object> mem = l(chat.get("members"));
                if (!mem.contains(uid)) {
                    if (mem.size() >= 1000) throw new Api(400, "В чате нет свободных мест");
                    mem.add(uid); dirty();
                    if (s(chat.get("type")).equals("group")) addMessage(chat, SYSTEM_ID, s(user(uid).get("name")) + " вступил(а)", null, null);
                    for (Object mid : mem) hub.push(s(mid), "chat", obj("reload", true));
                }
                return chatView(chat, uid);
            }
            throw new Api(404, "Канал или группа с таким username не найдены");
        }
        if (code.contains("/")) code = code.substring(code.lastIndexOf('/') + 1);
        if (code.length() < 6) throw new Api(400, "Неверная ссылка-приглашение");
        for (Map<String, Object> chat : chats.values()) {
            if (!code.equals(s(chat.get("invite")))) continue;
            List<Object> mem = l(chat.get("members"));
            if (!mem.contains(uid)) {
                if (mem.size() >= 1000) throw new Api(400, "В чате нет свободных мест");
                mem.add(uid);
                dirty();
                if (s(chat.get("type")).equals("group")) addMessage(chat, SYSTEM_ID, s(user(uid).get("name")) + " вступил(а) по ссылке", null, null);
                for (Object mid : mem) hub.push(s(mid), "chat", obj("reload", true));
            }
            return chatView(chat, uid);
        }
        throw new Api(404, "Ссылка недействительна или была отозвана");
    }

    synchronized Object chatMembers(String uid, Map<String, Object> body) {
        Map<String, Object> chat = chatFor(uid, s(body.get("chatId")));
        String type = s(chat.get("type"));
        if (!type.equals("group") && !type.equals("channel")) throw new Api(400, "Нельзя изменить этот чат");
        List<Object> mem = l(chat.get("members"));
        String action = s(body.get("action")), target = s(body.get("userId"));
        boolean isAdm = l(chat.get("admins")).contains(uid);
        switch (action) {
            case "add" -> {
                if (!isAdm) throw new Api(403, "Только для администраторов");
                if (!users.containsKey(target)) throw new Api(404, "Пользователь не найден");
                if (!mem.contains(target)) mem.add(target);
            }
            case "remove" -> {
                if (!isAdm) throw new Api(403, "Только для администраторов");
                if (target.equals(s(chat.get("owner")))) throw new Api(400, "Нельзя удалить владельца");
                mem.remove(target); l(chat.get("admins")).remove(target);
            }
            case "promote" -> {
                if (!uid.equals(s(chat.get("owner")))) throw new Api(403, "Только владелец назначает администраторов");
                if (mem.contains(target) && !l(chat.get("admins")).contains(target)) l(chat.get("admins")).add(target);
            }
            case "demote" -> {
                if (!uid.equals(s(chat.get("owner")))) throw new Api(403, "Только владелец снимает администраторов");
                if (!target.equals(s(chat.get("owner")))) l(chat.get("admins")).remove(target);
            }
            case "leave" -> {
                mem.remove(uid); l(chat.get("admins")).remove(uid);
                if (uid.equals(s(chat.get("owner"))) && !mem.isEmpty()) { chat.put("owner", mem.get(0)); if (!l(chat.get("admins")).contains(mem.get(0))) l(chat.get("admins")).add(mem.get(0)); }
                target = uid;
            }
            default -> throw new Api(400, "Неизвестное действие");
        }
        dirty();
        hub.push(uid, "chat", obj("reload", true));
        for (Object mid : mem) hub.push(s(mid), "chat", obj("reload", true));
        if (!target.isEmpty()) hub.push(target, "chat", obj("reload", true));
        return obj("ok", true);
    }

    // ---------- Админ-панель: номера +888 ----------
    private static String fmtNum(String n) { return n.length() == 10 ? "+" + n.substring(0, 3) + " " + n.substring(3, 7) + " " + n.substring(7) : "+" + n; }

    private Map<String, Object> numView(Map<String, Object> n) {
        Map<String, Object> v = new LinkedHashMap<>(n);
        v.put("pretty", fmtNum(s(n.get("number"))));
        String uid = s(n.get("userId"));
        Map<String, Object> u = uid.isEmpty() ? null : users.get(uid);
        v.put("owner", u == null ? null : u.get("name"));
        Code c = numCodes.get(s(n.get("number")));
        v.put("pendingCode", c != null && now() < c.exp ? c.code : null);
        return v;
    }

    synchronized Object adminNumbers(String uid) {
        requireAdmin(uid);
        List<Object> r = new ArrayList<>();
        for (Map<String, Object> n : numbers.values()) r.add(numView(n));
        Collections.reverse(r);
        return r;
    }

    /** Выдача номеров: count случайных, либо конкретный номер (number), либо маска с «x» вместо цифр. */
    synchronized Object adminIssueNumbers(String uid, Map<String, Object> body) {
        requireAdmin(uid);
        String note = trunc(s(body.get("note")).strip(), 80);
        List<Object> made = new ArrayList<>();
        String wanted = s(body.get("number")).replaceAll("[^0-9xX]", "").toLowerCase();
        if (!wanted.isEmpty()) {
            if (wanted.length() != 10 || !wanted.startsWith("888")) throw new Api(400, "Номер должен быть вида +888 XXXX XXX (10 цифр, начинается с 888)");
            boolean mask = wanted.contains("x");
            int cnt = mask ? (int) Math.max(1, Math.min(200, n(body.get("count")))) : 1;
            for (int i = 0; i < cnt; i++) {
                String num = null;
                for (int t = 0; t < 200 && num == null; t++) {
                    StringBuilder sb = new StringBuilder();
                    for (char ch : wanted.toCharArray()) sb.append(ch == 'x' ? (char) ('0' + RNG.nextInt(10)) : ch);
                    String cand = sb.toString();
                    if (!numbers.containsKey(cand) && byPhone(cand) == null) num = cand;
                    if (!mask) break;
                }
                if (num == null) { if (!mask) throw new Api(409, "Этот номер уже занят или выдан"); break; }
                made.add(numView(registerNumber(num, note)));
            }
        } else {
            int cnt = (int) Math.max(1, Math.min(500, n(body.get("count"))));
            for (int i = 0; i < cnt; i++) {
                String num;
                int guard = 0;
                do { num = "888" + String.format("%07d", RNG.nextInt(10_000_000)); } while ((numbers.containsKey(num) || byPhone(num) != null) && ++guard < 1000);
                if (guard >= 1000) break;
                made.add(numView(registerNumber(num, note)));
            }
        }
        dirty();
        return obj("ok", true, "issued", made);
    }

    private Map<String, Object> registerNumber(String num, String note) {
        Map<String, Object> n = obj("number", num, "userId", "", "note", note, "issuedAt", now());
        numbers.put(num, n);
        return n;
    }

    /** Привязать номер к существующему пользователю: он сможет входить по нему, код придёт в служебный чат. */
    synchronized Object adminAssignNumber(String uid, String number, String target) {
        requireAdmin(uid);
        Map<String, Object> n = numbers.get(number);
        if (n == null) throw new Api(404, "Номер не найден");
        if (!s(n.get("userId")).isEmpty()) throw new Api(409, "Номер уже закреплён за пользователем");
        Map<String, Object> u = user(target);
        if (isAdmin(u)) throw new Api(400, "Номер администратора менять нельзя");
        u.put("oldPhone", u.get("phone"));
        u.put("phone", number);
        n.put("userId", target);
        n.put("claimedAt", now());
        numCodes.remove(number);
        sessions.values().removeIf(target::equals);
        hub.kick(target);
        dirty();
        systemMessage(u, "Администратор выдал вам анонимный номер " + fmtNum(number) + ". Теперь входите по нему — код придёт в этот чат.");
        return obj("ok", true);
    }

    synchronized Object adminRevokeNumber(String uid, String number) {
        requireAdmin(uid);
        Map<String, Object> n = numbers.get(number);
        if (n == null) throw new Api(404, "Номер не найден");
        if (!s(n.get("userId")).isEmpty()) throw new Api(409, "Номер занят пользователем — сначала удалите или заблокируйте его");
        numbers.remove(number);
        numCodes.remove(number);
        dirty();
        return obj("ok", true);
    }

    synchronized Object adminFlag(String uid, String target, String flag, boolean value) {
        requireAdmin(uid);
        if (!flag.equals("verified") && !flag.equals("premium")) throw new Api(400, "Неизвестный флаг");
        Map<String, Object> u = user(target);
        u.put(flag, value);
        if (flag.equals("premium")) { u.put("premiumUntil", 0L); if (value) systemMessage(u, "⭐ Вам выдан LimeGram Premium навсегда!"); }
        dirty();
        Map<String, Object> pv = pub(u);
        hub.push(target, "user", pv);
        for (String c : contactsOf(target)) hub.push(c, "user", pv);
        return obj("ok", true);
    }

    synchronized Object adminResetPassword(String uid, String target) {
        requireAdmin(uid);
        Map<String, Object> u = user(target);
        u.remove("passHash"); u.remove("passSalt");
        dirty();
        return obj("ok", true);
    }

    synchronized Object adminKick(String uid, String target) {
        requireAdmin(uid);
        Map<String, Object> u = user(target);
        if (isAdmin(u)) throw new Api(400, "Нельзя завершить сессии администратора");
        sessions.values().removeIf(target::equals);
        hub.kick(target);
        dirty();
        return obj("ok", true);
    }

    // ---------- Админ-панель ----------
    private void requireAdmin(String uid) {
        if (!isAdmin(user(uid))) throw new Api(403, "Только для администратора");
    }

    synchronized Object adminStats(String uid) {
        requireAdmin(uid);
        int pr = 0, gr = 0, ch = 0, banned = 0, msgs = 0;
        for (Map<String, Object> c : chats.values()) {
            switch (s(c.get("type"))) { case "private" -> pr++; case "group" -> gr++; case "channel" -> ch++; default -> { } }
        }
        for (Map<String, Object> u : users.values()) if (b(u.get("banned"))) banned++;
        for (List<Map<String, Object>> ml : messages.values()) msgs += ml.size();
        return obj("users", users.size(), "online", hub.onlineCount(), "banned", banned, "privateChats", pr, "groups", gr,
                "channels", ch, "messages", msgs, "numbersFree", numbers.values().stream().filter(x -> s(x.get("userId")).isEmpty()).count(), "numbersUsed", numbers.values().stream().filter(x -> !s(x.get("userId")).isEmpty()).count(), "smsGateway", sms.realGateway() ? "Twilio" : "консоль (демо)");
    }

    synchronized Object adminUsers(String uid) {
        requireAdmin(uid);
        List<Object> r = new ArrayList<>();
        for (Map<String, Object> u : users.values()) {
            Map<String, Object> v = pub(u);
            v.put("phone", u.get("phone"));
            v.put("banned", u.get("banned"));
            v.put("createdAt", u.get("createdAt"));
            v.put("hasPassword", !s(u.get("passHash")).isEmpty());
            v.put("verified", b(u.get("verified"))); v.put("premium", prem(u));
            v.put("stars", n(u.get("stars"))); v.put("premiumUntil", prem(u) ? n(u.get("premiumUntil")) : 0);
            r.add(v);
        }
        return r;
    }

    synchronized Object adminBan(String uid, String target, boolean ban) {
        requireAdmin(uid);
        Map<String, Object> u = user(target);
        if (isAdmin(u)) throw new Api(400, "Нельзя заблокировать администратора");
        u.put("banned", ban);
        if (ban) { sessions.values().removeIf(target::equals); hub.kick(target); }
        dirty();
        return obj("ok", true);
    }

    synchronized Object adminDeleteUser(String uid, String target) {
        requireAdmin(uid);
        Map<String, Object> u = user(target);
        if (isAdmin(u)) throw new Api(400, "Нельзя удалить администратора");
        sessions.values().removeIf(target::equals);
        hub.kick(target);
        Set<String> affected = new HashSet<>();
        for (Iterator<Map<String, Object>> it = chats.values().iterator(); it.hasNext(); ) {
            Map<String, Object> c = it.next();
            List<Object> mem = l(c.get("members"));
            if (!mem.contains(target)) continue;
            String cid = s(c.get("id")), type = s(c.get("type"));
            for (Object o : mem) affected.add(s(o));
            mem.remove(target);
            l(c.get("admins")).remove(target);
            if (mem.isEmpty() || type.equals("private") || type.equals("saved") || type.equals("service")) {
                messages.remove(cid);
                it.remove();
            } else if (target.equals(s(c.get("owner")))) {
                c.put("owner", mem.get(0));
                if (!l(c.get("admins")).contains(mem.get(0))) l(c.get("admins")).add(mem.get(0));
            }
        }
        for (List<Map<String, Object>> ml : messages.values()) ml.removeIf(x -> target.equals(s(x.get("from"))));
        users.remove(target);
        dirty();
        affected.remove(target);
        for (String a : affected) hub.push(a, "chat", obj("reload", true));
        return obj("ok", true);
    }

    synchronized Object adminBroadcast(String uid, String text) {
        requireAdmin(uid);
        text = text.strip();
        if (text.isEmpty() || text.length() > 2000) throw new Api(400, "Текст рассылки: от 1 до 2000 символов");
        int cnt = 0;
        for (Map<String, Object> u : new ArrayList<>(users.values())) {
            if (b(u.get("banned"))) continue;
            systemMessage(u, "📢 " + text);
            cnt++;
        }
        return obj("ok", true, "sent", cnt);
    }

    // ======================= LimeGram Premium, звёзды, подарки =======================
    static final Map<String, Object[]> GIFTS = new LinkedHashMap<>();   // id -> {emoji, name, stars, stock, colors, Telegram gift id, slug}
    static {
        // Official Telegram regular StarGift IDs and Stars prices (catalog checked 2026-11-08).
        GIFTS.put("heart",   new Object[]{"💗", "Сердце любви", 15L, 0L, "#ff4fa3", "#ff0a73", 5170145012310081615L, "love-heart"});
        GIFTS.put("bear",    new Object[]{"🧸", "Мишка", 15L, 0L, "#d89b48", "#8f5b20", 5170233102089322756L, "teddy-bear"});
        GIFTS.put("box",     new Object[]{"🎁", "Подарочная коробка", 25L, 0L, "#ff3d5a", "#d5002b", 5170250947678437525L, "gift-box"});
        GIFTS.put("rose",    new Object[]{"🌹", "Красная роза", 25L, 0L, "#ff526f", "#c51d3a", 5168103777563050263L, "red-rose"});
        GIFTS.put("cake",    new Object[]{"🎂", "Торт на день рождения", 50L, 0L, "#ffd1df", "#ff668d", 5170144170496491616L, "birthday-cake"});
        GIFTS.put("bouquet", new Object[]{"💐", "Букет цветов", 50L, 0L, "#ff8bb7", "#b83a78", 5170314324215857265L, "bouquet-of-flowers"});
        GIFTS.put("rocket",  new Object[]{"🚀", "Ракета", 50L, 0L, "#79b9ff", "#3566d4", 5170564780938756245L, "rocket"});
        GIFTS.put("champ",   new Object[]{"🍾", "Бутылка шампанского", 50L, 0L, "#b7e58a", "#448b52", 6028601630662853006L, "champagne-bottle"});
        GIFTS.put("cup",     new Object[]{"🏆", "Кубок", 100L, 0L, "#ffd95c", "#c77800", 5168043875654172773L, "trophy"});
        GIFTS.put("ring",    new Object[]{"💍", "Бриллиантовое кольцо", 100L, 0L, "#9fe9ff", "#4b78db", 5170690322832818290L, "diamond-ring"});
        GIFTS.put("gem",     new Object[]{"💎", "Самоцвет", 100L, 0L, "#5ee8ff", "#1e74d8", 5170521118301225164L, "gem"});
    }
    static final Map<Integer, Long> PREMIUM_PRICE = new LinkedHashMap<>();   // месяцев -> звёзд
    static { PREMIUM_PRICE.put(1, 300L); PREMIUM_PRICE.put(3, 800L); PREMIUM_PRICE.put(12, 2500L); }

    long giftSold(String id) {
        long c = 0;
        for (Map<String, Object> u : users.values()) if (u.get("gifts") instanceof List<?> gl) for (Object o : gl) if (id.equals(s(m(o).get("gift")))) c++;
        return c;
    }

    synchronized Object giftCatalogView() {
        List<Object> r = new ArrayList<>();
        for (var e : GIFTS.entrySet()) {
            Object[] g = e.getValue(); long total = (Long) g[3];
            r.add(obj("id", e.getKey(), "emoji", g[0], "name", g[1], "price", g[2], "total", total, "left", total == 0 ? -1 : Math.max(0, total - giftSold(e.getKey())), "c1", g[4], "c2", g[5], "telegramGiftId", g[6], "telegramSlug", g[7]));
        }
        return obj("gifts", r, "plans", PREMIUM_PRICE.entrySet().stream().map(e -> obj("months", e.getKey(), "price", e.getValue())).toList());
    }

    static Object giftCatalog() {
        List<Object> r = new ArrayList<>();
        for (var e : GIFTS.entrySet()) r.add(obj("id", e.getKey(), "emoji", e.getValue()[0], "name", e.getValue()[1], "price", e.getValue()[2]));
        return obj("gifts", r, "plans", PREMIUM_PRICE.entrySet().stream().map(e -> obj("months", e.getKey(), "price", e.getValue())).toList());
    }

    boolean prem(Map<String, Object> u) {
        if (!b(u.get("premium"))) return false;
        long t = n(u.get("premiumUntil"));
        return t == 0 || t > now();
    }

    private String priv(Map<String, Object> u, String k) {
        return u.get("privacy") instanceof Map<?, ?> p ? s(p.get(k)) : "";
    }

    private List<Object> publicGifts(Map<String, Object> u) {
        List<Object> r = new ArrayList<>();
        if (!(u.get("gifts") instanceof List<?> gl)) return r;
        for (Object o : gl) {
            Map<String, Object> g = m(o);
            if (b(g.get("hidden")) || b(g.get("converted"))) continue;
            Object[] meta = GIFTS.get(s(g.get("gift")));
            r.add(obj("id", g.get("id"), "gift", g.get("gift"), "from", b(g.get("anon")) ? "" : g.get("from"), "ts", g.get("ts"), "num", g.get("num"), "total", g.get("total"),
                    "emoji", meta == null ? "🎁" : meta[0], "name", meta == null ? "Подарок" : meta[1], "price", meta == null ? 0 : meta[2],
                    "telegramGiftId", meta == null ? 0 : meta[6], "telegramSlug", meta == null ? "" : meta[7]));
        }
        return r;
    }

    private void starLog(Map<String, Object> u, long delta, String why) {
        List<Object> log = u.get("starLog") instanceof List<?> ? l(u.get("starLog")) : new ArrayList<>();
        log.add(0, obj("ts", now(), "d", delta, "why", why));
        while (log.size() > 40) log.remove(log.size() - 1);
        u.put("starLog", log);
    }

    private void addStars(Map<String, Object> u, long delta, String why) {
        long nv = Math.max(0, n(u.get("stars")) + delta);
        u.put("stars", nv);
        starLog(u, delta, why);
    }

    private void pushSelf(Map<String, Object> u) {
        String id = s(u.get("id"));
        Map<String, Object> pv = selfView(u);
        hub.push(id, "user", pv);
        Map<String, Object> pb = pub(u);
        for (String c : contactsOf(id)) hub.push(c, "user", pb);
    }

    private void grantPremium(Map<String, Object> u, int days) {
        // days: 0 — навсегда, >0 — продлить на N дней
        if (days == 0) { u.put("premium", true); u.put("premiumUntil", 0L); return; }
        boolean active = prem(u);
        if (active && n(u.get("premiumUntil")) == 0) return;      // уже навсегда
        long base = active ? n(u.get("premiumUntil")) : now();
        u.put("premium", true);
        u.put("premiumUntil", base + days * 86_400_000L);
    }

    synchronized Object adminStars(String uid, String target, long amount, boolean set) {
        requireAdmin(uid);
        if (Math.abs(amount) > 100_000_000L) throw new Api(400, "Слишком большое число");
        Map<String, Object> u = user(target);
        long before = n(u.get("stars"));
        long delta = set ? Math.max(0, amount) - before : amount;
        if (before + delta < 0) delta = -before;
        addStars(u, delta, "Администратор LimeGram");
        if (delta > 0) systemMessage(u, "⭐ Вам начислено " + delta + " звёзд. Баланс: " + n(u.get("stars")));
        dirty();
        pushSelf(u);
        return obj("ok", true, "stars", n(u.get("stars")));
    }

    /** days: 0 — навсегда, >0 — продлить на N дней, <0 — отозвать */
    synchronized Object adminPremium(String uid, String target, int days) {
        requireAdmin(uid);
        Map<String, Object> u = user(target);
        if (days < 0) { u.put("premium", false); u.put("premiumUntil", 0L); u.remove("emojiStatus"); }
        else {
            if (days > 36500) throw new Api(400, "Максимум 36500 дней");
            grantPremium(u, days);
            systemMessage(u, "⭐ Вам выдан LimeGram Premium " + (days == 0 ? "навсегда" : "на " + days + " дн.") + "! Откройте меню → LimeGram Premium.");
        }
        dirty();
        pushSelf(u);
        return obj("ok", true);
    }

    synchronized Object adminGrantAll(String uid, long stars, int days) {
        requireAdmin(uid);
        if (stars < 0 || stars > 1_000_000L || days < 0 || days > 36500) throw new Api(400, "Неверные значения");
        int cnt = 0;
        for (Map<String, Object> u : new ArrayList<>(users.values())) {
            if (b(u.get("banned"))) continue;
            if (stars > 0) addStars(u, stars, "Подарок от администратора");
            if (days > 0) grantPremium(u, days);
            systemMessage(u, "🎁 Подарок от LimeGram:" + (stars > 0 ? " " + stars + " ⭐" : "") + (days > 0 ? " Premium на " + days + " дн." : ""));
            pushSelf(u);
            cnt++;
        }
        dirty();
        return obj("ok", true, "count", cnt);
    }

    synchronized Object starsDaily(String uid) {
        Map<String, Object> u = user(uid);
        long last = n(u.get("dailyAt"));
        if (now() - last < 86_400_000L) throw new Api(429, "Бонус уже получен. Возвращайтесь позже");
        long amt = prem(u) ? 30 : 10;
        u.put("dailyAt", now());
        addStars(u, amt, "Ежедневный бонус");
        dirty();
        pushSelf(u);
        return obj("ok", true, "amount", amt, "stars", n(u.get("stars")));
    }

    synchronized Object starsTransfer(String uid, String to, long amount) {
        if (uid.equals(to)) throw new Api(400, "Нельзя отправить звёзды себе");
        if (amount < 1 || amount > 1_000_000L) throw new Api(400, "Сумма: от 1 до 1 000 000");
        Map<String, Object> a = user(uid), c = user(to);
        if (b(c.get("banned"))) throw new Api(403, "Пользователь недоступен");
        if (n(a.get("stars")) < amount) throw new Api(402, "Недостаточно звёзд");
        addStars(a, -amount, "Перевод → " + s(c.get("name")));
        addStars(c, amount, "Перевод от " + s(a.get("name")));
        systemMessage(c, "⭐ " + s(a.get("name")) + " отправил(а) вам " + amount + " звёзд");
        dirty();
        pushSelf(a); pushSelf(c);
        return obj("ok", true, "stars", n(a.get("stars")));
    }

    synchronized Object premiumBuy(String uid, int months) {
        Long price = PREMIUM_PRICE.get(months);
        if (price == null) throw new Api(400, "Неверный тариф");
        Map<String, Object> u = user(uid);
        if (prem(u) && n(u.get("premiumUntil")) == 0) throw new Api(409, "У вас уже Premium навсегда");
        if (n(u.get("stars")) < price) throw new Api(402, "Недостаточно звёзд: нужно " + price);
        addStars(u, -price, "LimeGram Premium на " + months + " мес.");
        grantPremium(u, months * 30);
        dirty();
        pushSelf(u);
        return obj("ok", true);
    }

    synchronized Object setEmojiStatus(String uid, String emoji) {
        Map<String, Object> u = user(uid);
        if (!prem(u)) throw new Api(403, "Эмодзи-статус доступен с LimeGram Premium");
        u.put("emojiStatus", trunc(emoji.strip(), 16));
        dirty();
        pushSelf(u);
        return obj("ok", true);
    }

    synchronized Object setPrivacy(String uid, String key, String val) {
        if (!Set.of("lastSeen", "about", "gifts", "phoneSearch", "photos", "forwards", "calls", "voices", "messages", "birthday", "music", "invites").contains(key)) throw new Api(400, "Неизвестная настройка");
        if (!val.equals("all") && !val.equals("nobody")) throw new Api(400, "Неверное значение");
        Map<String, Object> u = user(uid);
        Map<String, Object> p = u.get("privacy") instanceof Map<?, ?> ? m(u.get("privacy")) : new LinkedHashMap<>();
        p.put(key, val);
        u.put("privacy", p);
        dirty();
        pushSelf(u);
        return obj("ok", true);
    }

    synchronized Object giftSend(String uid, String to, String giftId, String text, boolean anon) {
        Object[] g = GIFTS.get(giftId);
        if (g == null) throw new Api(400, "Нет такого подарка");
        if (uid.equals(to)) throw new Api(400, "Подарок нужно отправить другому пользователю");
        long price = (Long) g[2], total = (Long) g[3], sold = giftSold(giftId);
        if (total > 0 && sold >= total) throw new Api(409, "Этот подарок распродан");
        Map<String, Object> a = user(uid), c = user(to);
        if (b(c.get("banned"))) throw new Api(403, "Пользователь недоступен");
        if (l(c.getOrDefault("blocked", new ArrayList<>())).contains(uid)) throw new Api(403, "Пользователь ограничил получение сообщений от вас");
        if (n(a.get("stars")) < price) throw new Api(402, "Недостаточно звёзд: нужно " + price);
        addStars(a, -price, "Подарок " + g[0] + " → " + s(c.get("name")));
        List<Object> gl = c.get("gifts") instanceof List<?> ? l(c.get("gifts")) : new ArrayList<>();
        String gid = "g" + now() + RNG.nextInt(1000);
        gl.add(0, obj("id", gid, "gift", giftId, "from", uid, "anon", anon, "ts", now(), "price", price, "num", sold + 1, "total", total));
        c.put("gifts", gl);
        openPrivate(uid, to);
        Map<String, Object> chat = chats.get("p_" + Math.min(Long.parseLong(uid), Long.parseLong(to)) + "_" + Math.max(Long.parseLong(uid), Long.parseLong(to)));
        String note = trunc(text.strip(), 200);
        // текст остаётся запасным вариантом (превью в списке чатов), а клиент рисует анимированную карточку по полю "gift"
        Map<String, Object> giftInfo = obj("id", gid, "gift", giftId, "emoji", g[0], "name", g[1], "price", price, "num", sold + 1, "total", total,
                "anon", anon, "to", to, "note", note, "c1", g[4], "c2", g[5]);
        addMessage(chat, uid, "🎁 Подарок: " + g[0] + " " + g[1] + (total > 0 ? " №" + (sold + 1) + " из " + total : "") + " (" + price + " ⭐)" + (anon ? " · анонимно" : "") + (note.isEmpty() ? "" : "\n" + note),
                null, null, null, null, obj("gift", giftInfo));
        dirty();
        pushSelf(a); pushSelf(c);
        return obj("ok", true, "stars", n(a.get("stars")));
    }

    /** Обмен полученного подарка на звёзды (80% цены). */
    synchronized Object giftConvert(String uid, String id) {
        Map<String, Object> u = user(uid);
        if (!(u.get("gifts") instanceof List<?> gl)) throw new Api(404, "Подарок не найден");
        for (Object o : gl) {
            Map<String, Object> g = m(o);
            if (!id.equals(s(g.get("id")))) continue;
            if (b(g.get("converted"))) throw new Api(409, "Уже обменян");
            long back = n(g.get("price")) * 8 / 10;
            g.put("converted", true);
            addStars(u, back, "Обмен подарка");
            dirty();
            pushSelf(u);
            return obj("ok", true, "stars", n(u.get("stars")), "back", back);
        }
        throw new Api(404, "Подарок не найден");
    }

    synchronized Object giftHide(String uid, String id, boolean hidden) {
        Map<String, Object> u = user(uid);
        if (u.get("gifts") instanceof List<?> gl) for (Object o : gl) if (id.equals(s(m(o).get("id")))) m(o).put("hidden", hidden);
        dirty();
        pushSelf(u);
        return obj("ok", true);
    }

    synchronized Object contactsList(String uid) {
        List<Object> r = new ArrayList<>();
        for (String c : contactsOf(uid)) { Map<String, Object> u = users.get(c); if (u != null && !b(u.get("banned"))) r.add(pub(u)); }
        r.sort(Comparator.comparing(o -> s(m(o).get("name")).toLowerCase()));
        return r;
    }

    // ======================= Автоудаление, отложенные сообщения, кубики =======================
    static final Map<String, Integer> DICE = Map.of("🎲", 6, "🎯", 6, "🎳", 6, "🏀", 5, "⚽", 5, "🎰", 64);

    synchronized Object setTtl(String uid, String chatId, long ttl) {
        Map<String, Object> chat = chatFor(uid, chatId);
        String type = s(chat.get("type"));
        if (type.equals("service")) throw new Api(400, "Для служебного чата недоступно");
        if ((type.equals("group") || type.equals("channel")) && !l(chat.get("admins")).contains(uid)) throw new Api(403, "Только администраторы могут менять автоудаление");
        if (ttl != 0 && ttl != 86400 && ttl != 604800 && ttl != 2592000) throw new Api(400, "Неверный срок");
        chat.put("ttl", ttl);
        dirty();
        for (Object mid : l(chat.get("members"))) hub.push(s(mid), "chat", obj("reload", true));
        return obj("ok", true);
    }

    private List<Object> schedOf(Map<String, Object> u) {
        if (!(u.get("scheduled") instanceof List<?>)) u.put("scheduled", new ArrayList<>());
        return l(u.get("scheduled"));
    }

    synchronized Object schedule(String uid, String chatId, String text, long at) {
        chatFor(uid, chatId);
        text = text.strip();
        if (text.isEmpty() || text.length() > 4000) throw new Api(400, "Текст: от 1 до 4000 символов");
        if (at < now() + 5000 || at > now() + 365L * 86_400_000L) throw new Api(400, "Время: от 5 секунд до года вперёд");
        List<Object> sc = schedOf(user(uid));
        if (sc.size() >= 50) throw new Api(400, "Не больше 50 отложенных сообщений");
        sc.add(obj("id", "s" + (++seq), "chatId", chatId, "text", text, "at", at));
        dirty();
        return obj("ok", true);
    }

    synchronized Object scheduledList(String uid, String chatId) {
        List<Object> r = new ArrayList<>();
        for (Object o : schedOf(user(uid))) if (chatId.isEmpty() || chatId.equals(s(m(o).get("chatId")))) r.add(o);
        r.sort(Comparator.comparingLong(o -> n(m(o).get("at"))));
        return r;
    }

    synchronized Object scheduleCancel(String uid, String id) {
        schedOf(user(uid)).removeIf(o -> id.equals(s(m(o).get("id"))));
        dirty();
        return obj("ok", true);
    }

    private synchronized void tick() {
        long t = now();
        for (Map.Entry<String, List<Map<String, Object>>> e : messages.entrySet()) {
            List<Map<String, Object>> ml = e.getValue();
            List<String> gone = new ArrayList<>();
            for (Iterator<Map<String, Object>> it = ml.iterator(); it.hasNext(); ) {
                Map<String, Object> x = it.next();
                long ex = n(x.get("expires"));
                if (ex > 0 && ex <= t) { gone.add(s(x.get("id"))); it.remove(); }
            }
            if (gone.isEmpty()) continue;
            Map<String, Object> chat = chats.get(e.getKey());
            if (chat == null) continue;
            dirty();
            for (String id : gone) for (Object mid : l(chat.get("members"))) hub.push(s(mid), "message_delete", obj("chatId", e.getKey(), "id", id));
        }
        for (Map<String, Object> u : new ArrayList<>(users.values())) {
            if (!(u.get("scheduled") instanceof List<?> sl) || sl.isEmpty()) continue;
            for (Object o : new ArrayList<>(sl)) {
                Map<String, Object> it = m(o);
                if (n(it.get("at")) > t) continue;
                sl.remove(o);
                dirty();
                try { send(s(u.get("id")), obj("chatId", it.get("chatId"), "text", it.get("text"))); }
                catch (Api ex) { systemMessage(u, "⏰ Отложенное сообщение не отправлено: " + ex.getMessage()); }
            }
        }
    }
}
