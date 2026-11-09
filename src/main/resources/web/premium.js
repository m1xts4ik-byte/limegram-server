'use strict';
/* LimeGram Premium, звёзды, подарки, контакты, приватность */
const PREM_PERKS = [['🌟', 'Эмодзи-статус', 'Значок рядом с именем у всех'], ['📎', 'Файлы до 5 МБ', 'Вместо 3 МБ'], ['✍️', 'О себе до 500 символов', 'Вместо 200'],
  ['🎨', 'Эксклюзивные цвета профиля', '8 дополнительных цветов'], ['⭐', 'Ежедневный бонус ×3', '30 звёзд в день вместо 10'], ['💫', 'Золотая звезда в профиле', 'Видна во всех чатах']];
const STATUS_EMOJI = ['🔥', '💎', '🚀', '👑', '🌈', '🍋', '❤️', '😎', '🎮', '🎧', '☕', '🌙', '⚡', '🦄', '🍀', '🎯'];
let GIFT_CACHE = null;
const catalog = async () => GIFT_CACHE || (GIFT_CACHE = await api('/gifts/catalog'));
const refreshMe = async () => { try { S.me = { ...S.me, ...(await api('/me')) }; } catch { } return S.me; };
const fmtDT = ts => new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const starI = (sz = 16) => I.star.replace('class="ic"', `class="ic prem" style="width:${sz}px;height:${sz}px;margin:0 2px;vertical-align:-3px"`);
const fmtN = n => (n || 0).toLocaleString('ru-RU');
const giftOf = id => (GIFT_CACHE?.gifts || []).find(g => g.id === id) || { emoji: '🎁', name: 'Подарок', price: 0 };
const premLeft = me => me.premium ? (me.premiumUntil ? 'до ' + fmtDT(me.premiumUntil) : 'навсегда') : '';

function userPicker(mb, host, onPick, label = 'Найти пользователя') {
  host.innerHTML = `<label class="field">${label}<input class="up-in" placeholder="Имя, @username или номер" autocomplete="off"></label><div class="up-res"></div>`;
  let tm; const inp = $('.up-in', host), res = $('.up-res', host);
  const show = list => { res.innerHTML = list.map(u => `<div class="item" data-u="${esc(u.id)}">${userAv(u, 'sm')}<div class="mid"><div class="t">${esc(u.name)}${badges(u)}</div><div class="pv">${u.username ? '@' + esc(u.username) : 'ID ' + esc(u.id)}</div></div></div>`).join('') || '<p style="color:var(--muted);font-size:13px;text-align:center">Никого не найдено</p>'; };
  api('/contacts').then(r => { cacheUsers(r); if (!inp.value) show(r.slice(0, 8)); }).catch(() => { });
  inp.oninput = e => { clearTimeout(tm); tm = setTimeout(async () => { try { const r = await api('/users/search?q=' + encodeURIComponent(e.target.value)); cacheUsers(r); show(r); } catch { } }, 300); };
  res.onclick = e => { const it = e.target.closest('[data-u]'); if (it) onPick(S.users[it.dataset.u] || { id: it.dataset.u, name: 'Пользователь', color: '#888' }); };
  return inp;
}

/* ---------- LimeGram Premium ---------- */
async function openPremium() {
  await catalog(); await refreshMe();
  const mb = modal(''); const m = $('.modal', mb);
  const draw = () => {
    const me = S.me, plans = GIFT_CACHE.plans;
    m.innerHTML = `<div class="mh"><h2>LimeGram Premium</h2><button class="ico" id="cx">${I.close}</button></div>
    <div class="prem-hero"><div class="prem-star">${I.star}</div><h3>${me.premium ? 'Premium активен' : 'Откройте больше'}</h3><p>${me.premium ? esc(premLeft(me)) : 'Эксклюзивные возможности LimeGram'}</p></div>
    <div class="prem-perks">${PREM_PERKS.map(([e, t, d]) => `<div class="row2"><div><span style="font-size:20px;margin-right:8px">${e}</span><b>${t}</b><small style="margin-left:34px">${d}</small></div></div>`).join('')}</div>
    ${me.premium ? `<div class="field" style="margin-top:12px">Эмодзи-статус: <b>${esc(me.emoji || 'не выбран')}</b></div><div class="est-grid">${STATUS_EMOJI.map(e => `<button data-e="${e}" class="${me.emoji === e ? 'on' : ''}">${e}</button>`).join('')}<button data-e="" title="Убрать">✕</button></div>` : ''}
    <div class="field" style="margin-top:14px;flex-direction:row;align-items:center;gap:4px;flex-wrap:wrap">${me.premium && !me.premiumUntil ? 'У вас Premium навсегда' : me.premium ? 'Продлить за звёзды' : 'Купить за звёзды'} · баланс ${starI(14)}<b>${fmtN(me.stars)}</b></div>
    ${me.premium && !me.premiumUntil ? '' : `<div class="plans">${plans.map(p => `<button class="plan" data-m="${p.months}"><b>${p.months === 12 ? '1 год' : p.months + ' мес.'}</b><span>${starI(14)}${fmtN(p.price)}</span>${p.months > 1 ? `<i>−${Math.round(100 - p.price / (plans[0].price * p.months) * 100)}%</i>` : ''}</button>`).join('')}</div>
    <button class="btn ghost" id="gs" style="margin-top:8px">Получить звёзды (бонус)…</button>`}`;
    $('#cx', m).onclick = mb.close;
    $('#gs', m)?.addEventListener('click', () => { mb.close(); openStars(); });
    $$('.plan', m).forEach(b => b.onclick = async () => { try { await api('/premium/buy', { months: +b.dataset.m }); await refreshMe(); toast('LimeGram Premium активирован ⭐'); draw(); } catch (er) { fail(er); } });
    $$('.est-grid [data-e]', m).forEach(b => b.onclick = async () => { try { await api('/me/emoji-status', { emoji: b.dataset.e }); await refreshMe(); draw(); renderList(); } catch (er) { fail(er); } });
  };
  draw();
}

/* ---------- Мои звёзды ---------- */
async function openStars() {
  await catalog(); await refreshMe();
  const mb = modal(''); const m = $('.modal', mb);
  const draw = () => {
    const me = S.me, wait = 86400000 - (Date.now() - (me.dailyAt || 0)), can = wait <= 0;
    const mine = (me.gifts || []).filter(g => !g.converted);
    m.innerHTML = `<div class="mh"><h2>Мои звёзды</h2><button class="ico" id="cx">${I.close}</button></div>
    <div class="prem-hero"><div class="prem-star">${I.star}</div><h3 style="font-size:32px">${fmtN(me.stars)}</h3><p>звёзд на балансе</p></div>
    <button class="btn" id="dl" ${can ? '' : 'disabled'}>${can ? `Забрать ежедневный бонус (+${me.premium ? 30 : 10} ★)` : 'Следующий бонус через ' + Math.floor(wait / 3600000) + ' ч ' + Math.floor(wait % 3600000 / 60000) + ' мин'}</button>
    <div class="grid2" style="margin-top:8px"><button class="btn ghost" id="tr">Перевести звёзды</button><button class="btn ghost" id="gf">Отправить подарок</button></div>
    ${mine.length ? `<div class="field" style="margin-top:14px">Мои подарки (${mine.length})</div><div class="gift-row">${mine.map(g => { const c = giftOf(g.gift); const f = S.users[g.from]; return `<div class="gcard own ${g.hidden ? 'dim' : ''}" style="--c1:${c.c1 || '#60a5fa'};--c2:${c.c2 || '#1d4ed8'}" title="${g.anon ? 'Анонимно' : f ? 'От ' + esc(f.name) : ''}">${g.total ? `<i class="gl">№${g.num} из ${fmtN(g.total)}</i>` : ''}<span class="ge">${c.emoji}</span><div class="gb"><button data-cv="${esc(g.id)}">→ ${Math.floor(g.price * 0.8)}★</button><button data-hd="${esc(g.id)}" data-v="${!g.hidden}">${g.hidden ? 'Показать' : 'Скрыть'}</button></div></div>`; }).join('')}</div>` : ''}
    <div class="field" style="margin-top:14px">История</div>${(me.starLog || []).slice(0, 12).map(l => `<div class="row2"><div>${esc(l.why)}<small>${fmtDT(l.ts)}</small></div><b style="color:${l.d >= 0 ? 'var(--ok)' : 'var(--danger)'}">${l.d >= 0 ? '+' : ''}${fmtN(l.d)}</b></div>`).join('') || '<p style="color:var(--muted);font-size:13px">Пока пусто</p>'}`;
    $('#cx', m).onclick = mb.close;
    $('#dl', m).onclick = async () => { try { const r = await api('/stars/daily', {}); await refreshMe(); toast('+' + r.amount + ' звёзд'); draw(); } catch (er) { fail(er); } };
    $('#tr', m).onclick = () => { mb.close(); transferModal(); };
    $('#gf', m).onclick = () => { mb.close(); openGifts(); };
    $$('[data-cv]', m).forEach(b => b.onclick = async () => { try { const r = await api('/gifts/convert', { id: b.dataset.cv }); await refreshMe(); toast('Обменяно на ' + r.back + ' звёзд'); draw(); } catch (er) { fail(er); } });
    $$('[data-hd]', m).forEach(b => b.onclick = async () => { try { await api('/gifts/hide', { id: b.dataset.hd, hidden: b.dataset.v === 'true' }); await refreshMe(); draw(); } catch (er) { fail(er); } });
  };
  draw();
}
function transferModal(user) {
  const mb = modal(''); const m = $('.modal', mb);
  const step = u => {
    if (!u) { m.innerHTML = `<div class="mh"><h2>Перевод звёзд</h2><button class="ico" id="cx">${I.close}</button></div><div id="pk"></div>`; userPicker(mb, $('#pk', m), step, 'Кому перевести').focus(); }
    else m.innerHTML = `<div class="mh"><h2>Перевод звёзд</h2><button class="ico" id="cx">${I.close}</button></div><div class="item">${userAv(u, 'sm')}<div class="mid"><div class="t">${esc(u.name)}</div></div></div><label class="field">Сумма (баланс ${fmtN(S.me.stars)} ★)<input id="am" type="number" min="1" value="10"></label><div class="err" id="er"></div><button class="btn" id="ok">Отправить</button>`;
    $('#cx', m).onclick = mb.close;
    $('#ok', m)?.addEventListener('click', async () => { try { await api('/stars/send', { userId: u.id, amount: +$('#am', m).value }); await refreshMe(); mb.close(); toast('Звёзды отправлены'); } catch (er) { $('#er', m).textContent = er.message; } });
  };
  step(user);
}

/* ---------- Подарки (магазин как в Telegram) ---------- */
const giftCard = (g, cls = '') => `<button class="gcard ${cls}" data-g="${g.id}" ${g.left === 0 ? 'disabled' : ''} style="--c1:${g.c1};--c2:${g.c2}">${g.total ? `<i class="gl">${g.left === 0 ? 'Распродано' : 'Осталось ' + fmtN(g.left) + ' из ' + fmtN(g.total)}</i>` : ''}<span class="ge">${g.emoji}</span><b class="gp">${starI(13)}${fmtN(g.price)}</b></button>`;
async function openGifts(user) {
  GIFT_CACHE = null; await catalog(); await refreshMe();
  const mb = modal('', true); const m = $('.modal', mb); let sel = null, to = user || null, tab = 'all';
  const draw = () => {
    const list = GIFT_CACHE.gifts.filter(g => tab === 'all' || (tab === 'lim' ? g.total > 0 : g.total === 0));
    const g0 = sel && GIFT_CACHE.gifts.find(g => g.id === sel);
    m.innerHTML = `<div class="mh"><h2>Отправить подарок</h2><button class="ico" id="cx">${I.close}</button></div>
    ${to ? `<div class="item" id="who">${userAv(to, 'sm')}<div class="mid"><div class="t">${esc(to.name)}</div><div class="pv">нажмите, чтобы выбрать другого</div></div></div>` : '<div id="pk"></div>'}
    <p style="margin:6px 0;color:var(--muted);font-size:13px">Подарок появится в профиле получателя. Его можно обменять на звёзды. Ваш баланс: ${starI(13)}<b>${fmtN(S.me.stars)}</b></p>
    <div class="seg" id="gt2" style="margin-bottom:8px">${[['all', 'Все подарки'], ['lim', 'Лимитированные'], ['reg', 'Обычные']].map(([k, v]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div class="gift-grid">${list.map(g => giftCard(g, sel === g.id ? 'on' : '')).join('')}</div>
    ${g0 ? `<div class="gprev" style="--c1:${g0.c1};--c2:${g0.c2}"><span>${g0.emoji}</span><div><b>${esc(g0.name)}</b><small>${g0.total ? 'Лимитированный · ' + fmtN(g0.left) + ' из ' + fmtN(g0.total) : 'Обычный подарок'}</small></div></div>` : ''}
    <label class="field">Подпись (необязательно)<input id="gt" maxlength="200" placeholder="Добавьте сообщение"></label>
    <label class="row2" style="cursor:pointer"><div>Скрыть моё имя<small>Получатель не узнает, от кого подарок</small></div><input type="checkbox" id="ga"></label>
    <div class="err" id="er"></div><button class="btn" id="ok">${g0 ? 'Отправить подарок за ' + fmtN(g0.price) + ' ★' : 'Отправить подарок'}</button>`;
    $('#cx', m).onclick = mb.close;
    $('#who', m)?.addEventListener('click', () => { to = null; draw(); });
    if (!to) userPicker(mb, $('#pk', m), u => { to = u; draw(); });
    $$('#gt2 [data-t]', m).forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    $$('.gcard', m).forEach(b => b.onclick = () => { sel = b.dataset.g; draw(); });
    $('#ok', m).onclick = async () => { if (!to) return $('#er', m).textContent = 'Выберите получателя'; if (!sel) return $('#er', m).textContent = 'Выберите подарок'; try { await api('/gifts/send', { userId: to.id, gift: sel, text: $('#gt', m).value, anon: $('#ga', m).checked }); await refreshMe(); mb.close(); toast('Подарок отправлен 🎁'); loadChats(); } catch (er) { $('#er', m).textContent = er.message; } };
  };
  draw();
}

/* ---------- Контакты ---------- */
async function openContacts() {
  const mb = modal(`<div class="mh"><h2>Контакты</h2><button class="ico" id="cx">${I.close}</button></div><label class="field">Поиск<input id="cf" placeholder="Имя или @username"></label><div id="cl2"><div class="spin"></div></div>`);
  $('#cx', mb).onclick = mb.close; let all = [];
  const show = () => { const f = $('#cf', mb).value.toLowerCase().replace('@', ''); $('#cl2', mb).innerHTML = all.filter(u => !f || (u.name + ' ' + u.username).toLowerCase().includes(f)).map(u => `<div class="item" data-u="${esc(u.id)}">${userAv(u, 'sm')}<div class="mid"><div class="t">${esc(u.name)}${badges(u)}</div><div class="pv">${esc(fmtSeen(u))}</div></div></div>`).join('') || '<p style="color:var(--muted);text-align:center">Контактов нет. Найдите людей через «Новый чат».</p>'; };
  try { all = await api('/contacts'); cacheUsers(all); show(); } catch (er) { fail(er); }
  $('#cf', mb).oninput = show;
  $('#cl2', mb).onclick = async e => { const it = e.target.closest('[data-u]'); if (!it) return; try { const c = await api('/chats/open-private', { userId: it.dataset.u }); mb.close(); await loadChats(); openChat(c.id); } catch (er) { fail(er); } };
}

/* ---------- Конфиденциальность (вкладка настроек) ---------- */
const PRIV_ROWS = [['lastSeen', 'Время захода', 'Кто видит, когда вы были в сети'], ['phoneSearch', 'Поиск по номеру', 'Можно ли найти вас по номеру телефона'], ['about', 'О себе', 'Кто видит описание профиля'], ['gifts', 'Подарки', 'Кто видит ваши подарки']];
function privacyBody() {
  const p = S.me.privacy || {};
  return passBody() + PRIV_ROWS.map(([k, t, d]) => `<div class="row2"><div>${t}<small>${d}</small></div><div class="seg" data-pk="${k}" style="min-width:150px">${[['all', 'Все'], ['nobody', 'Никто']].map(([v, n]) => `<button data-v="${v}" class="${(p[k] || 'all') === v ? 'on' : ''}">${n}</button>`).join('')}</div></div>`).join('')
    + `<p style="color:var(--muted);font-size:12.5px">Заблокированные: ${S.chats.filter(c => c.blocked).length}. Управлять блокировкой можно в профиле пользователя.</p>`;
}
function bindPrivacy(m, redraw) {
  bindPass(m, redraw);
  $$('[data-pk] [data-v]', m).forEach(b => b.onclick = async () => { const k = b.parentElement.dataset.pk; try { await api('/me/privacy', { key: k, value: b.dataset.v }); S.me.privacy = { ...(S.me.privacy || {}), [k]: b.dataset.v }; redraw(); } catch (er) { fail(er); } });
}

/* ---------- Автоудаление сообщений ---------- */
const TTLS = [[0, 'Выкл.'], [86400, '1 день'], [604800, '1 неделя'], [2592000, '1 месяц']];
const ttlLabel = t => (TTLS.find(x => x[0] === (t || 0)) || TTLS[0])[1];
function ttlModal(c) {
  const mb = modal(`<div class="mh"><h2>Автоудаление</h2><button class="ico" id="cx">${I.close}</button></div><p style="margin:0 0 8px;color:var(--muted);font-size:13px">Новые сообщения в этом чате будут удаляться у всех через выбранное время. Уже отправленные не затрагиваются.</p>${TTLS.map(([v, l]) => `<button class="btn ${(c.ttl || 0) === v ? '' : 'ghost'}" data-t="${v}" style="margin-bottom:6px">${l}</button>`).join('')}`);
  $('#cx', mb).onclick = mb.close;
  mb.addEventListener('click', async e => { const b = e.target.closest('[data-t]'); if (!b) return; try { await api('/chats/ttl', { chatId: c.id, ttl: +b.dataset.t }); mb.close(); await loadChats(); toast('Автоудаление: ' + ttlLabel(+b.dataset.t)); } catch (er) { fail(er); } });
}

/* ---------- Отложенные сообщения ---------- */
async function scheduleModal(c) {
  const pad = n => String(n).padStart(2, '0'), d0 = new Date(Date.now() + 3600000);
  const dv = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}T${pad(d0.getHours())}:${pad(d0.getMinutes())}`;
  const mb = modal(`<div class="mh"><h2>Отложенные сообщения</h2><button class="ico" id="cx">${I.close}</button></div>
    <label class="field">Текст<textarea id="st" rows="3" maxlength="4000">${esc($('#tx')?.value || '')}</textarea></label>
    <label class="field">Когда отправить<input id="sd" type="datetime-local" value="${dv}"></label><div class="err" id="er"></div><button class="btn" id="ok">Запланировать</button>
    <div class="field" style="margin-top:14px">Запланировано</div><div id="sl"></div>`);
  $('#cx', mb).onclick = mb.close;
  const list = async () => { try { const r = await api('/messages/scheduled?chat=' + encodeURIComponent(c.id)); $('#sl', mb).innerHTML = r.map(x => `<div class="row2"><div>${esc(x.text.slice(0, 80))}<small>${fmtDT(x.at)}</small></div><button class="mini-b" data-x="${esc(x.id)}">Отменить</button></div>`).join('') || '<p style="color:var(--muted);font-size:13px">Нет отложенных сообщений</p>'; } catch (er) { fail(er); } };
  $('#ok', mb).onclick = async () => { try { await api('/messages/schedule', { chatId: c.id, text: $('#st', mb).value, at: new Date($('#sd', mb).value).getTime() }); const tx = $('#tx'); if (tx && tx.value === $('#st', mb).value) { tx.value = ''; tx.oninput && tx.oninput(); } $('#er', mb).textContent = ''; toast('Сообщение запланировано'); list(); } catch (er) { $('#er', mb).textContent = er.message; } };
  mb.addEventListener('click', async e => { const b = e.target.closest('[data-x]'); if (b) { try { await api('/messages/schedule-cancel', { id: b.dataset.x }); list(); } catch (er) { fail(er); } } });
  list();
}

/* ---------- Код-пароль (локальная блокировка) ---------- */
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lg:' + s)))].map(b => b.toString(16).padStart(2, '0')).join('');
let LOCKED = false, lastActive = Date.now(), hiddenAt = 0, lockFails = 0;
function lockNow() {
  if (!localStorage.getItem('lg_pass') || LOCKED) return; LOCKED = true;
  const ov = document.createElement('div'); ov.id = 'lockov';
  ov.innerHTML = `<div class="lockbox"><div class="lockic">${I.lock}</div><h2>LimeGram заблокирован</h2><p>Введите код-пароль</p><input id="lp" type="password" inputmode="numeric" autocomplete="off" maxlength="16"><div class="err" id="le"></div><button class="btn" id="lb">Разблокировать</button></div>`;
  document.body.append(ov);
  const go = async () => {
    if (lockFails >= 5) { $('#le', ov).textContent = 'Слишком много попыток. Подождите 30 секунд'; return; }
    if (await sha($('#lp', ov).value) === localStorage.getItem('lg_pass')) { LOCKED = false; lockFails = 0; ov.remove(); lastActive = Date.now(); }
    else { lockFails++; $('#le', ov).textContent = 'Неверный код'; $('#lp', ov).value = ''; if (lockFails >= 5) setTimeout(() => { lockFails = 0; $('#le', ov).textContent = ''; }, 30000); }
  };
  $('#lb', ov).onclick = go; $('#lp', ov).onkeydown = e => { if (e.key === 'Enter') go(); }; setTimeout(() => $('#lp', ov).focus(), 50);
}
function passModal(done) {
  const mb = modal(`<div class="mh"><h2>Код-пароль</h2><button class="ico" id="cx">${I.close}</button></div><p style="margin:0;color:var(--muted);font-size:13px">Приложение будет запрашивать код при запуске и после простоя. Код хранится только на этом устройстве. Если забудете, нужно будет выйти из аккаунта.</p>
    <label class="field">Новый код (4–16 символов)<input id="p1" type="password" autocomplete="off" maxlength="16"></label><label class="field">Повторите код<input id="p2" type="password" autocomplete="off" maxlength="16"></label><div class="err" id="er"></div><button class="btn" id="ok">Включить</button>`);
  $('#cx', mb).onclick = mb.close;
  $('#ok', mb).onclick = async () => { const a = $('#p1', mb).value; if (a.length < 4) return $('#er', mb).textContent = 'Минимум 4 символа'; if (a !== $('#p2', mb).value) return $('#er', mb).textContent = 'Коды не совпадают'; localStorage.setItem('lg_pass', await sha(a)); mb.close(); toast('Код-пароль включён'); done(); };
}
['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true }));
setInterval(() => { const mins = +(localStorage.getItem('lg_autolock') || 5); if (localStorage.getItem('lg_pass') && !LOCKED && Date.now() - lastActive > mins * 60000) lockNow(); }, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt && localStorage.getItem('lg_pass') && Date.now() - hiddenAt > (+(localStorage.getItem('lg_autolock') || 5)) * 60000) lockNow(); });
if (localStorage.getItem('lg_pass')) lockNow();
const passBody = () => { const on = !!localStorage.getItem('lg_pass'), al = localStorage.getItem('lg_autolock') || '5';
  return `<div class="row2"><div>Код-пароль<small>${on ? 'Включён' : 'Защита приложения кодом'}</small></div><button class="mini-b" id="pcs">${on ? 'Отключить' : 'Включить'}</button></div>${on ? `<div class="row2"><div>Автоблокировка<small>Через сколько минут простоя</small></div><div class="seg" id="alk" style="min-width:200px">${['1', '5', '15', '60'].map(v => `<button data-v="${v}" class="${al === v ? 'on' : ''}">${v} мин</button>`).join('')}</div></div>` : ''}`; };
function bindPass(m, redraw) {
  $('#pcs', m)?.addEventListener('click', () => { if (localStorage.getItem('lg_pass')) { localStorage.removeItem('lg_pass'); toast('Код-пароль отключён'); redraw(); } else passModal(redraw); });
  $$('#alk [data-v]', m).forEach(b => b.onclick = () => { localStorage.setItem('lg_autolock', b.dataset.v); redraw(); });
}
