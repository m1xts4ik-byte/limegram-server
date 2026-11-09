package limegram;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import limegram.Core.Api;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public final class Main {
    static final Hub hub = new Hub();
    static final Sms sms = new Sms();
    static final Core core = new Core(hub, sms, Path.of(Core.env("LIMEGRAM_DATA", "data/limegram.json")));
    static final Object NONE = new Object();

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(Core.env("PORT", "8080"));
        HttpServer srv = HttpServer.create(new InetSocketAddress(port), 0);
        srv.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        srv.createContext("/", Main::handle);
        srv.start();
        System.out.println("==============================================");
        System.out.println(" LimeGram запущен:  http://localhost:" + port);
        System.out.println(" Админ: +888 8888 888, код " + Core.ADMIN_CODE + ", облачный пароль задан");
        System.out.println(" SMS-шлюз: " + (sms.realGateway() ? "Twilio" : "нет (коды печатаются здесь и показываются в демо-режиме)"));
        if (Core.DEMO_SHOW_CODE) System.out.println(" ВНИМАНИЕ: LIMEGRAM_DEMO_SHOW_CODE=true — коды видны на экране входа. Для продакшена поставьте false.");
        System.out.println("==============================================");
    }

    static void handle(HttpExchange ex) throws IOException {
        try {
            String path = ex.getRequestURI().getPath();
            if (path.startsWith("/api/")) api(ex, path); else staticFile(ex, path);
        } catch (Api e) {
            sendJson(ex, e.status, Core.obj("error", e.getMessage()));
        } catch (Throwable t) {
            t.printStackTrace();
            try { sendJson(ex, 500, Core.obj("error", "Внутренняя ошибка сервера")); } catch (Exception ignore) { }
        } finally {
            ex.close();
        }
    }

    static String str(Map<String, Object> b, String k) { return Core.s(b.get(k)); }

    static void api(HttpExchange ex, String path) throws Exception {
        String method = ex.getRequestMethod();
        Map<String, String> q = query(ex.getRequestURI().getRawQuery());
        Map<String, Object> body = method.equals("POST") ? readBody(ex) : new HashMap<>();
        String key = method + " " + path;

        Object res = NONE;
        switch (key) {
            case "POST /api/auth/send-code" -> res = core.sendCode(str(body, "phone"));
            case "POST /api/auth/verify" -> res = core.verify(str(body, "phone"), str(body, "code"), str(body, "name"));
            case "POST /api/auth/password" -> res = core.password(str(body, "tmp"), str(body, "password"));
            default -> { }
        }
        if (res != NONE) { sendJson(ex, 200, res); return; }

        String token = bearer(ex, q);
        Map<String, Object> u = core.auth(token);
        if (u == null) throw new Api(401, "Требуется вход");
        String uid = Core.s(u.get("id"));
        if (key.equals("GET /api/events")) { events(ex, uid); return; }

        res = switch (key) {
            case "POST /api/auth/logout" -> core.logout(token);
            case "GET /api/me" -> core.me(uid);
            case "POST /api/me/update" -> core.updateMe(uid, body);
            case "POST /api/me/password" -> core.changePassword(uid, str(body, "old"), str(body, "new"));
            case "GET /api/chats" -> core.chatList(uid);
            case "GET /api/users/search" -> core.search(uid, q.getOrDefault("q", ""));
            case "POST /api/chats/open-private" -> core.openPrivate(uid, str(body, "userId"));
            case "POST /api/chats/create" -> core.createChat(uid, body);
            case "POST /api/chats/read" -> core.read(uid, str(body, "chatId"));
            case "POST /api/chats/typing" -> core.typing(uid, str(body, "chatId"));
            case "GET /api/messages" -> core.messages(uid, q.getOrDefault("chat", ""), q.get("before"));
            case "POST /api/messages/send" -> core.send(uid, body);
            case "POST /api/messages/edit" -> core.edit(uid, body);
            case "POST /api/messages/delete" -> core.delete(uid, body);
            case "POST /api/messages/react" -> core.react(uid, body);
            case "POST /api/messages/vote" -> core.vote(uid, body);
            case "POST /api/messages/poll-close" -> core.closePoll(uid, body);
            case "POST /api/chats/clear" -> core.clearHistory(uid, str(body, "chatId"));
            case "POST /api/users/block" -> core.block(uid, str(body, "userId"), !Boolean.FALSE.equals(body.get("blocked")));
            case "POST /api/chats/invite" -> core.invite(uid, body);
            case "POST /api/chats/join" -> core.join(uid, str(body, "code"));
            case "POST /api/chats/pin" -> core.pin(uid, body);
            case "POST /api/chats/prefs" -> core.chatPrefs(uid, body);
            case "POST /api/chats/edit" -> core.chatEdit(uid, body);
            case "POST /api/chats/members" -> core.chatMembers(uid, body);
            case "GET /api/messages/search" -> core.searchMessages(uid, q.getOrDefault("chat", ""), q.getOrDefault("q", ""));
            case "POST /api/me/settings" -> core.saveSettings(uid, body);
            case "GET /api/users/info" -> core.userInfo(uid, q.getOrDefault("id", ""));
            case "GET /api/admin/numbers" -> core.adminNumbers(uid);
            case "POST /api/admin/numbers/issue" -> core.adminIssueNumbers(uid, body);
            case "POST /api/admin/numbers/assign" -> core.adminAssignNumber(uid, str(body, "number"), str(body, "userId"));
            case "POST /api/admin/numbers/revoke" -> core.adminRevokeNumber(uid, str(body, "number"));
            case "POST /api/chats/ttl" -> core.setTtl(uid, str(body, "chatId"), Core.n(body.get("ttl")));
            case "POST /api/messages/schedule" -> core.schedule(uid, str(body, "chatId"), str(body, "text"), Core.n(body.get("at")));
            case "GET /api/messages/scheduled" -> core.scheduledList(uid, q.getOrDefault("chat", ""));
            case "POST /api/messages/schedule-cancel" -> core.scheduleCancel(uid, str(body, "id"));
            case "POST /api/admin/stars" -> core.adminStars(uid, str(body, "userId"), Core.n(body.get("amount")), Boolean.TRUE.equals(body.get("set")));
            case "POST /api/admin/premium" -> core.adminPremium(uid, str(body, "userId"), (int) Core.n(body.get("days")));
            case "POST /api/admin/grant-all" -> core.adminGrantAll(uid, Core.n(body.get("stars")), (int) Core.n(body.get("days")));
            case "POST /api/stars/daily" -> core.starsDaily(uid);
            case "POST /api/stars/send" -> core.starsTransfer(uid, str(body, "userId"), Core.n(body.get("amount")));
            case "POST /api/premium/buy" -> core.premiumBuy(uid, (int) Core.n(body.get("months")));
            case "POST /api/me/emoji-status" -> core.setEmojiStatus(uid, str(body, "emoji"));
            case "POST /api/me/privacy" -> core.setPrivacy(uid, str(body, "key"), str(body, "value"));
            case "POST /api/gifts/send" -> core.giftSend(uid, str(body, "userId"), str(body, "gift"), str(body, "text"), Boolean.TRUE.equals(body.get("anon")));
            case "POST /api/gifts/convert" -> core.giftConvert(uid, str(body, "id"));
            case "POST /api/gifts/hide" -> core.giftHide(uid, str(body, "id"), !Boolean.FALSE.equals(body.get("hidden")));
            case "GET /api/contacts" -> core.contactsList(uid);
            case "GET /api/gifts/catalog" -> core.giftCatalogView();
            case "POST /api/admin/flag" -> core.adminFlag(uid, str(body, "userId"), str(body, "flag"), Boolean.TRUE.equals(body.get("value")));
            case "POST /api/admin/reset-password" -> core.adminResetPassword(uid, str(body, "userId"));
            case "POST /api/admin/kick" -> core.adminKick(uid, str(body, "userId"));
            case "GET /api/admin/stats" -> core.adminStats(uid);
            case "GET /api/admin/users" -> core.adminUsers(uid);
            case "POST /api/admin/ban" -> core.adminBan(uid, str(body, "userId"), Boolean.TRUE.equals(body.get("banned")));
            case "POST /api/admin/delete-user" -> core.adminDeleteUser(uid, str(body, "userId"));
            case "POST /api/admin/broadcast" -> core.adminBroadcast(uid, str(body, "text"));
            default -> throw new Api(404, "Не найдено");
        };
        sendJson(ex, 200, res);
    }

    static void events(HttpExchange ex, String uid) throws IOException {
        Headers h = ex.getResponseHeaders();
        h.set("Content-Type", "text/event-stream; charset=utf-8");
        h.set("Cache-Control", "no-cache");
        h.set("X-Accel-Buffering", "no");
        ex.sendResponseHeaders(200, 0);
        OutputStream os = ex.getResponseBody();
        Hub.Client c = hub.connect(uid);
        if (c.first) core.presence(uid, true);
        try {
            os.write(": connected\n\n".getBytes(StandardCharsets.UTF_8));
            os.flush();
            while (!c.closed) {
                String frame = c.q.poll(15, TimeUnit.SECONDS);
                if (frame == null) frame = ": ping\n\n";
                if (frame.isEmpty()) break;
                os.write(frame.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }
        } catch (IOException | InterruptedException ignored) {
        } finally {
            if (hub.disconnect(uid, c)) core.presence(uid, false);
        }
    }

    static String bearer(HttpExchange ex, Map<String, String> q) {
        String a = ex.getRequestHeaders().getFirst("Authorization");
        if (a != null && a.startsWith("Bearer ")) return a.substring(7).trim();
        return q.get("token");
    }

    static Map<String, String> query(String raw) {
        Map<String, String> m = new HashMap<>();
        if (raw == null) return m;
        for (String p : raw.split("&")) {
            if (p.isEmpty()) continue;
            int i = p.indexOf('=');
            String k = i < 0 ? p : p.substring(0, i), v = i < 0 ? "" : p.substring(i + 1);
            m.put(URLDecoder.decode(k, StandardCharsets.UTF_8), URLDecoder.decode(v, StandardCharsets.UTF_8));
        }
        return m;
    }

    static Map<String, Object> readBody(HttpExchange ex) throws IOException {
        byte[] data;
        try (InputStream in = ex.getRequestBody()) { data = in.readNBytes(8_000_001); }
        if (data.length > 8_000_000) throw new Api(413, "Слишком большой запрос");
        if (data.length == 0) return new HashMap<>();
        try {
            Object o = Json.parse(new String(data, StandardCharsets.UTF_8));
            if (o instanceof Map<?, ?>) return Core.m(o);
        } catch (RuntimeException e) { /* ниже */ }
        throw new Api(400, "Некорректный JSON");
    }

    static void sendJson(HttpExchange ex, int status, Object o) throws IOException {
        String out;
        synchronized (core) { out = Json.str(o); }   // сериализация под тем же замком, что и изменения данных
        byte[] b = out.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(status, b.length);
        ex.getResponseBody().write(b);
    }

    static void staticFile(HttpExchange ex, String path) throws IOException {
        if (path.equals("/")) path = "/index.html";
        if (path.contains("..")) throw new Api(400, "Bad path");
        try (InputStream in = Main.class.getResourceAsStream("/web" + path)) {
            if (in == null) throw new Api(404, "Не найдено");
            byte[] b = in.readAllBytes();
            String t = path.endsWith(".html") ? "text/html; charset=utf-8" : path.endsWith(".css") ? "text/css; charset=utf-8"
                    : path.endsWith(".js") ? "text/javascript; charset=utf-8" : path.endsWith(".svg") ? "image/svg+xml" : path.endsWith(".woff2") ? "font/woff2" : path.endsWith(".png") ? "image/png" : path.endsWith(".ico") ? "image/x-icon" : "application/octet-stream";
            Headers h = ex.getResponseHeaders();
            h.set("Content-Type", t);
            h.set("Cache-Control", "no-cache");
            h.set("X-Content-Type-Options", "nosniff");
            ex.sendResponseHeaders(200, b.length);
            ex.getResponseBody().write(b);
        }
    }
}
