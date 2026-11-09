'use strict';
/* LimeGram — клиент (чистый JS, без зависимостей). Иконки: icons.js */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PLANE = '<rect x="13" y="15" width="38" height="28" rx="11" fill="#fff"/><path d="M19 39l-2 11 13-8z" fill="#fff"/><g fill="none" stroke="#2a7fe0" stroke-width="1.9" stroke-linecap="round"><circle cx="32" cy="29" r="9.5"/><path d="M32 29L39.19 33.15" stroke-width="1.6"/><path d="M32 29L32.00 37.30" stroke-width="1.6"/><path d="M32 29L24.81 33.15" stroke-width="1.6"/><path d="M32 29L24.81 24.85" stroke-width="1.6"/><path d="M32 29L32.00 20.70" stroke-width="1.6"/><path d="M32 29L39.19 24.85" stroke-width="1.6"/></g><circle cx="32" cy="29" r="1.6" fill="#2a7fe0"/>';
const LOGO = '<svg viewBox="0 0 64 64" class="logo"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb2ff"/><stop offset="1" stop-color="#2a7fe0"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#lg)"/>' + PLANE + '</svg>';
const COLORS = ['#3390ec', '#2eaadc', '#7b61ff', '#e0568a', '#f08c3a', '#e5484d', '#14a3a3', '#8e6bd1'];
const ACCENTS = ['#3390ec', '#2eaadc', '#7b61ff', '#e0568a', '#f08c3a', '#e5484d'];
const REACTS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🎉', '👎'];
const EMO = {
  '😀': '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕'.split(' '),
  '👋': '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🧠 👀 👁 👅 👄 💋'.split(' '),
  '🐶': '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦅 🦉 🐺 🐗 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🐙 🦀 🐠 🐬 🐳 🌵 🌲 🌴 🌸 🌹 🌻 🌞 🌙 ⭐ ⚡ 🔥 🌈 ☁️ ❄️ 💧'.split(' '),
  '🍔': '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🌽 🥕 🍞 🧀 🥚 🍳 🥓 🥩 🍗 🍔 🍟 🍕 🌭 🌮 🍣 🍜 🍝 🍩 🍪 🎂 🍰 🍫 🍬 🍿 ☕ 🍵 🍺 🍷 🥂'.split(' '),
  '⚽': '⚽ 🏀 🏈 ⚾ 🎾 🏐 🎱 🏓 🥊 🎯 🎮 🎲 🎸 🎹 🎧 🎤 🎬 🚗 🚕 🚀 ✈️ 🚲 🏠 🏝 ⌚ 📱 💻 📷 💡 🔑 💰 🎁 🎈 🎉 🎊 ❤️ 🧡 💛 💙 💜 🖤 🤍 💔 💯 ✅ ❌ ⚠️ ❓ ❗'.split(' '),
};
const S = { token: localStorage.getItem('lg_token'), me: null, chats: [], active: null, msgs: {}, more: {}, users: {}, typing: {}, reply: null, edit: null, attach: null, filter: '', found: [], es: null, folder: 'all', fresh: new Set(), drafts: {}, info: false, away: 0, rec: null, settings: JSON.parse(localStorage.getItem('lg_set') || '{}') };

/* ---------- Оформление ---------- */
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join(''); }
function applySettings() {
  const st = S.settings, root = document.documentElement;
  const th = st.theme || 'auto';
  root.dataset.theme = th === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : th;
  const ac = st.accent || '#3390ec';
  root.style.setProperty('--primary', ac); root.style.setProperty('--primary-d', shade(ac, .86));
  root.style.setProperty('--out', root.dataset.theme === 'dark' ? (ac === '#3390ec' ? '#2b5278' : shade(ac, .55)) : ac);
  root.style.setProperty('--fs', (st.fontSize || 15) + 'px');
  const m = $('#main'); if (m) m.className = 'main ' + ((st.bg || 'pat') === 'pat' ? 'pat' : '') + ((st.bg || 'pat') === 'flat' ? ' flat' : '');
  if (st.bg === 'flat') root.style.setProperty('--chat-a', root.dataset.theme === 'dark' ? '#0e1621' : '#d5e3f3'), root.style.setProperty('--chat-b', root.dataset.theme === 'dark' ? '#0e1621' : '#d5e3f3'), root.style.setProperty('--chat-c', root.dataset.theme === 'dark' ? '#0e1621' : '#d5e3f3');
  else ['--chat-a', '--chat-b', '--chat-c'].forEach(v => root.style.removeProperty(v));
}
function saveSettings(patch) {
  S.settings = { ...S.settings, ...patch }; localStorage.setItem('lg_set', JSON.stringify(S.settings)); applySettings();
  if (S.token) api('/me/settings', patch).catch(() => { });
}
applySettings();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings);

async function api(path, body) {
  const o = { headers: {} };
  if (S.token) o.headers.Authorization = 'Bearer ' + S.token;
  if (body !== undefined) { o.method = 'POST'; o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
  const r = await fetch('/api' + path, o);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401 && S.token) localLogout(); throw new Error(j.error || 'Ошибка ' + r.status); }
  return j;
}

/* ---------- Утилиты ---------- */
const initials = n => (String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => [...w][0]).join('') || '?').toUpperCase();
const hashColor = id => COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDay = ts => { const d = new Date(ts), n = new Date(); if (d.toDateString() === n.toDateString()) return 'Сегодня'; const y = new Date(n - 864e5); if (d.toDateString() === y.toDateString()) return 'Вчера'; return d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' }); };
function fmtList(ts) { const d = new Date(ts), n = new Date(); if (d.toDateString() === n.toDateString()) return fmtTime(ts); if (n - d < 6 * 864e5) return d.toLocaleDateString('ru', { weekday: 'short' }); return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' }); }
function fmtSeen(u) { if (u.online) return 'в сети'; if (u.hiddenSeen || !u.lastSeen) return 'был(а) недавно'; const d = Date.now() - u.lastSeen; if (d < 60000) return 'был(а) только что'; if (d < 864e5) return 'был(а) в ' + fmtTime(u.lastSeen); return 'был(а) ' + fmtList(u.lastSeen); }
const fmtDur = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ';
const fmtPhone = p => { p = String(p || ''); return p.length === 10 && p.startsWith('888') ? `+888 ${p.slice(3, 7)} ${p.slice(7)}` : '+' + p; };
const isEmojiOnly = t => { t = (t || '').trim(); return t && t.length <= 24 && /^(\p{Extended_Pictographic}|\u200d|\ufe0f|\s){1,6}$/u.test(t) && [...t.matchAll(/\p{Extended_Pictographic}/gu)].length <= 3; };
function formatText(t) {
  const codes = [];
  let h = esc(t).replace(/```([\s\S]*?)```/g, (_, c) => { codes.push('<pre>' + c.replace(/^\n/, '') + '</pre>'); return '\u0000' + (codes.length - 1) + '\u0000'; })
    .replace(/`([^`\n]+)`/g, (_, c) => { codes.push('<code>' + c + '</code>'); return '\u0000' + (codes.length - 1) + '\u0000'; });
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/__([^_\n]+)__/g, '<i>$1</i>').replace(/~~([^~\n]+)~~/g, '<s>$1</s>').replace(/\|\|([^|\n]+)\|\|/g, '<span class="sp">$1</span>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/limegram:\/\/join\/([A-Za-z0-9]{6,32})/g, '<a href="#" class="jl" data-join="$1">limegram://join/$1</a>')
    .replace(/(^|[\s(])@([A-Za-z0-9_]{3,32})(?![\w])/g, '$1<span class="men" data-mention="$2">@$2</span>');
  return h.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
}
function cacheUsers(list) { (list || []).forEach(u => { S.users[u.id] = { ...(S.users[u.id] || {}), ...u }; }); }
const chat = id => S.chats.find(c => c.id === id);
const prefs = c => c.prefs || {};
function title(c) { return c.type === 'private' ? (c.peer ? c.peer.name : 'Пользователь') : c.title; }
const PCOLORS = ['#ec4899', '#06b6d4', '#f43f5e', '#8b5cf6', '#fbbf24', '#10b981', '#64748b', '#d946ef'];
const maxFile = () => (S.me && S.me.premium ? 5 : 3) * 1024 * 1024;
const badges = u => (u.verified ? I.verified : '') + (u.premium ? (u.emoji ? `<span class="est" title="LimeGram Premium">${esc(u.emoji)}</span>` : I.star.replace('class="ic"', 'class="ic prem"')) : '');
function avatarHtml(c, cls = '') {
  if (c.type === 'service') return `<div class="av ${cls}" style="background:none">${LOGO}</div>`;
  if (c.type === 'saved') return `<div class="av ${cls}" style="background:#3390ec">${I.bookmark}</div>`;
  if (c.type === 'private' && c.peer) return userAv(S.users[c.peer.id] || c.peer, cls);
  return `<div class="av ${cls}" style="background-color:${hashColor(c.id)}">${esc(initials(c.title))}</div>`;
}
function userAv(u, cls = '') { return `<div class="av ${cls}" style="background-color:${esc(u.color)}">${esc(initials(u.name))}${u.online ? '<i class="on-dot"></i>' : ''}</div>`; }

/* ---------- Звук и уведомления ---------- */
let actx;
function beep(freq = 880) {
  if (S.settings.sounds === '0') return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(.12, actx.currentTime + .01); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .22); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .24); } catch { }
}
function notify(c, m) {
  if (prefs(c).muted) return;
  beep(m.from === '0' ? 700 : 940);
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && S.settings.notify !== '0') {
    try { const n = new Notification(title(c), { body: previewOf(m).slice(0, 120), silent: true }); n.onclick = () => { window.focus(); openChat(c.id); }; } catch { }
  }
}

/* ---------- Окна, меню, уведомления ---------- */
function toast(msg, bad) {
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2600);
}
const fail = er => toast(er.message || String(er), true);
function modal(html, wide) {
  const mb = document.createElement('div'); mb.className = 'mb';
  mb.innerHTML = `<div class="modal ${wide ? 'wide' : ''}">${html}</div>`;
  mb.close = () => { if (mb.closing) return; mb.closing = true; mb.classList.add('out'); setTimeout(() => mb.remove(), 150); };
  mb.addEventListener('mousedown', e => { if (e.target === mb) mb.close(); });
  document.body.appendChild(mb); return mb;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const l = $('.lightbox'); if (l) return l.remove(); const m = $$('.mb').pop(); if (m) m.close(); else if ($('.ctx')) closeCtx(); else if (S.sel) clearSel(); } });
function confirmBox(text, okLabel = 'Да', danger) {
  return new Promise(res => {
    const mb = modal(`<div class="mh"><h2>${esc(text)}</h2></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn small ghost" id="n">Отмена</button><button class="btn small ${danger ? 'danger' : ''}" id="y" style="${danger ? 'color:var(--danger)' : ''}">${esc(okLabel)}</button></div>`);
    $('#n', mb).onclick = () => { mb.close(); res(false); }; $('#y', mb).onclick = () => { mb.close(); res(true); }; $('#y', mb).focus();
  });
}
function closeCtx() { $$('.ctx').forEach(x => x.remove()); }
function ctxMenu(x, y, items, top) {
  closeCtx();
  const m = document.createElement('div'); m.className = 'ctx';
  m.innerHTML = (top || '') + items.filter(Boolean).map((it, i) => `<button data-i="${i}" class="${it.red ? 'red' : ''}">${I[it.icon] || ''}${esc(it.label)}</button>`).join('');
  const list = items.filter(Boolean);
  m.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { closeCtx(); list[+b.dataset.i].fn(); } });
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + 'px'; m.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + 'px';
  setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!m.contains(e.target)) { closeCtx(); } document.removeEventListener('mousedown', f); }));
  return m;
}
document.addEventListener('mousedown', e => {   // ripple
  const b = e.target.closest('.ico,.btn,.fab,.item,.mi,.send'); if (!b) return;
  b.classList.add('rp'); const r = b.getBoundingClientRect(), s = document.createElement('span'); s.className = 'rpl';
  s.style.left = e.clientX - r.left + 'px'; s.style.top = e.clientY - r.top + 'px'; b.appendChild(s); setTimeout(() => s.remove(), 600);
});
const copyText = t => { (navigator.clipboard?.writeText(t) || Promise.reject()).then(() => toast('Скопировано'), () => toast('Не удалось скопировать', true)); };

/* ---------- Вход ---------- */
function renderAuth(step = 'phone', ctx = {}) {
  const card = inner => { $('#root').innerHTML = `<div class="auth"><div class="auth-card" key="${step}">${LOGO}<h1>LimeGram</h1>${inner}</div></div>`; };
  const bind = fn => { $('#af').addEventListener('submit', async e => { e.preventDefault(); const b = $('#ab'); b.disabled = true; $('#ae').textContent = ''; try { await fn(); } catch (er) { $('#ae').textContent = er.message; b.disabled = false; } }); };
  if (step === 'phone') {
    card(`<p>Войдите по номеру телефона.<br>Анонимные номера <b>+888</b> выдаёт администратор.</p>
      <form id="af" style="display:contents"><label class="field">Номер телефона<input id="ph" type="tel" autocomplete="tel" placeholder="+888 8888 888" value="${esc(ctx.phone || '')}" required></label>
      <div class="err" id="ae"></div><button class="btn" id="ab">Далее</button></form>`);
    $('#ph').focus();
    bind(async () => { const phone = $('#ph').value; const r = await api('/auth/send-code', { phone }); renderAuth('code', { phone, isNew: r.isNew, demoCode: r.demoCode, anon: r.anon }); });
  } else if (step === 'code') {
    card(`<p>Мы отправили код на <b>${esc(ctx.phone)}</b>.</p>
      ${ctx.anon ? `<div class="anon">${I.info}<span>${ctx.isNew ? 'Это новый анонимный номер. Код вам сообщит администратор, выдавший номер.' : 'Код отправлен в чат LimeGram на ваших других устройствах.'}</span></div>` : (ctx.isNew ? '' : `<div class="anon">${I.info}<span>Код также отправлен в служебный чат LimeGram, если вы уже вошли на другом устройстве.</span></div>`)}
      ${ctx.demoCode ? `<div class="demo">Демо-режим, SMS-шлюз не подключён. Код: <b id="dc">${esc(ctx.demoCode)}</b> (нажмите, чтобы подставить)</div>` : ''}
      <form id="af" style="display:contents"><label class="field">Код<input id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label>
      ${ctx.isNew ? '<label class="field">Ваше имя<input id="nm" maxlength="64" autocomplete="name" required></label>' : ''}
      <div class="err" id="ae"></div><button class="btn" id="ab">Войти</button><button type="button" class="btn ghost" id="bk">Другой номер</button></form>`);
    $('#cd').focus(); const dc = $('#dc'); if (dc) $('.demo').onclick = () => { $('#cd').value = ctx.demoCode; };
    $('#bk').onclick = () => renderAuth('phone', ctx);
    bind(async () => { const r = await api('/auth/verify', { phone: ctx.phone, code: $('#cd').value, name: ctx.isNew ? $('#nm').value : undefined }); if (r.needPassword) renderAuth('pw', { tmp: r.tmp, phone: ctx.phone }); else login(r); });
  } else {
    card(`<p>Включена двухэтапная аутентификация.<br>Введите облачный пароль.</p>
      <form id="af" style="display:contents"><label class="field">Облачный пароль<input id="pw" type="password" autocomplete="current-password" required></label>
      <div class="err" id="ae"></div><button class="btn" id="ab">Продолжить</button></form>`);
    $('#pw').focus(); bind(async () => login(await api('/auth/password', { tmp: ctx.tmp, password: $('#pw').value })));
  }
}
function login(r) { S.token = r.token; localStorage.setItem('lg_token', r.token); S.me = r.user; adoptSettings(); startApp(); }
function adoptSettings() { if (S.me && S.me.settings && Object.keys(S.me.settings).length) { S.settings = { ...S.settings, ...S.me.settings }; localStorage.setItem('lg_set', JSON.stringify(S.settings)); applySettings(); } }
function localLogout() {
  localStorage.removeItem('lg_token'); S.token = null; S.me = null; S.chats = []; S.active = null; S.msgs = {};
  if (S.es) { S.es.close(); S.es = null; } renderAuth();
}

/* ---------- Приложение ---------- */
async function boot() {
  if (!S.token) return renderAuth();
  try { S.me = await api('/me'); adoptSettings(); startApp(); } catch { renderAuth(); }
}
const FOLDERS = [['all', 'Все'], ['private', 'Личные'], ['group', 'Группы'], ['channel', 'Каналы'], ['archive', 'Архив']];
function startApp() {
  $('#root').innerHTML = `<div class="app" id="app"><aside class="side">
    <div class="side-head"><button class="ico" id="bMenu" title="Меню">${I.menu}</button><div class="search">${I.search}<input id="q" placeholder="Поиск" autocomplete="off"></div></div>
    <div class="folders" id="fo"></div><div class="chatlist" id="cl"></div>
    <button class="fab" id="bNew" title="Новый чат">${I.edit}</button></aside><main class="main pat" id="main"></main></div>`;
  applySettings();
  $('#bNew').onclick = () => openNewChat('private');
  $('#bMenu').onclick = openDrawer;
  let tm;
  $('#q').oninput = e => {
    S.filter = e.target.value.trim(); renderList(); clearTimeout(tm);
    if (S.filter.length >= 2) tm = setTimeout(async () => { try { S.found = await api('/users/search?q=' + encodeURIComponent(S.filter)); cacheUsers(S.found); renderList(); } catch { } }, 300); else S.found = [];
  };
  $('#cl').onclick = onListClick;
  $('#cl').oncontextmenu = onListCtx;
  renderMain(); loadChats(); connect();
  if ('Notification' in window && Notification.permission === 'default') setTimeout(() => Notification.requestPermission(), 3000);
}
function openDrawer() {
  if ($('.drawer')) return;
  const bg = document.createElement('div'); bg.className = 'drawer-bg'; const d = document.createElement('div'); d.className = 'drawer';
  const items = [['user', 'Мой профиль', () => openUserInfo(S.me.id)], ['users', 'Создать группу', () => openNewChat('group')], ['channel', 'Создать канал', () => openNewChat('channel')], ['user', 'Контакты', openContacts], ['bookmark', 'Избранное', () => openChat('s_' + S.me.id)], ['star', 'LimeGram Premium', openPremium], ['star', 'Мои звёзды (' + (S.me.stars || 0) + ')', openStars], ['gift', 'Отправить подарок', () => openGifts()], ['settings', 'Настройки', () => openSettings('look')]];
  if (localStorage.getItem('lg_pass')) items.push(['lock', 'Заблокировать приложение', lockNow]);
  if (S.me.isAdmin) items.push(['shield', 'Админ-панель', openAdmin]);
  const dark = document.documentElement.dataset.theme === 'dark';
  d.innerHTML = `<div class="me"><button class="ico tg" id="dTg" style="color:#fff">${dark ? I.sun : I.moon}</button>${userAv(S.me, 'sm').replace('<i class="on-dot"></i>', '')}<div class="nm">${esc(S.me.name)}${badges(S.me)}</div><div class="ph">${esc(fmtPhone(S.me.phone))}</div></div>
    ${items.map((x, i) => `<button class="mi" data-i="${i}">${I[x[0]]}${x[1]}</button>`).join('')}<div class="sp"></div>
    <button class="mi" id="dOut">${I.logout}Выйти</button><div class="ver">LimeGram Desktop 3.0</div>`;
  const close = () => { d.classList.add('out'); bg.style.opacity = 0; setTimeout(() => { d.remove(); bg.remove(); }, 200); };
  bg.onclick = close; d.onclick = e => { const b = e.target.closest('.mi[data-i]'); if (b) { close(); setTimeout(items[+b.dataset.i][2], 120); } };
  $('#dTg', d).onclick = () => { saveSettings({ theme: dark ? 'light' : 'dark' }); close(); };
  $('#dOut', d).onclick = async () => { close(); try { await api('/auth/logout', {}); } catch { } localLogout(); };
  document.body.append(bg, d);
}

async function loadChats() {
  try { S.chats = await api('/chats'); S.chats.forEach(c => cacheUsers(c.members)); renderList(); if (S.active && !chat(S.active)) { S.active = null; renderMain(); } else if (S.active) { renderHead(); renderPin(); } updateTitle(); } catch { }
}
function chatMatches(c) {
  const p = prefs(c);
  if (S.folder === 'archive') return !!p.archived;
  if (p.archived) return false;
  return S.folder === 'all' || (S.folder === 'private' ? (c.type === 'private' || c.type === 'saved' || c.type === 'service') : c.type === S.folder);
}
function renderFolders() {
  const el = $('#fo'); if (!el) return;
  const arch = S.chats.some(c => prefs(c).archived);
  const list = FOLDERS.filter(f => f[0] !== 'archive' || arch);
  if (!list.some(f => f[0] === S.folder)) S.folder = 'all';
  const cnt = k => S.chats.filter(c => { const sv = S.folder; S.folder = k; const r = chatMatches(c) && !prefs(c).muted && c.unread; S.folder = sv; return r; }).length;
  el.innerHTML = list.map(f => { const n = f[0] === 'all' ? 0 : cnt(f[0]); return `<button data-f="${f[0]}" class="${S.folder === f[0] ? 'on' : ''}">${f[1]}${n ? `<i>${n}</i>` : ''}</button>`; }).join('') + '<span class="bar"></span>';
  el.onclick = e => { const b = e.target.closest('[data-f]'); if (b) { S.folder = b.dataset.f; renderList(); } };
  const on = $('.on', el), bar = $('.bar', el); if (on && bar) { bar.style.left = (on.offsetLeft + 10) + 'px'; bar.style.width = (on.offsetWidth - 20) + 'px'; }
}
function previewOf(m) {
  if (m.text) return m.text;
  if (m.poll) return '📊 ' + m.poll.q;
  if (m.attach) { const t = String(m.attach.type); return t.startsWith('image/') ? 'Фото' : t.startsWith('audio/') ? 'Голосовое сообщение' : t.startsWith('video/') ? 'Видео' : m.attach.name; }
  return '';
}
function renderList() {
  const el = $('#cl'); if (!el) return; renderFolders();
  const f = S.filter.toLowerCase();
  const list = S.chats.filter(c => f ? title(c).toLowerCase().includes(f) : chatMatches(c))
    .sort((a, b) => (!!prefs(b).pinned - !!prefs(a).pinned) || b.lastTs - a.lastTs);
  let h = list.map((c, i) => {
    const typing = Object.keys(S.typing).some(k => k.startsWith(c.id + ':')); const l = c.last, p = prefs(c);
    let pv = '';
    if (typing) pv = 'печатает…';
    else if (l) { const who = l.from === S.me.id ? 'Вы: ' : (c.type === 'group' && S.users[l.from] ? S.users[l.from].name.split(' ')[0] + ': ' : ''); pv = who + previewOf(l); }
    return `<div class="item ${c.id === S.active ? 'on' : ''}" data-chat="${esc(c.id)}" style="animation-delay:${Math.min(i, 12) * 12}ms">${avatarHtml(c)}
      <div class="mid"><div class="row"><span class="t">${esc(title(c))}${c.type === 'private' && c.peer ? badges(S.users[c.peer.id] || c.peer) : ''}${p.muted ? I.mute.replace('class="ic"', 'class="ic mini"') : ''}</span><span class="time">${l ? fmtList(l.ts) : ''}</span></div>
      <div class="row"><span class="pv ${typing ? 'typing' : ''}">${esc(pv)}</span>${c.mentions ? '<span class="badge men2">@</span>' : ''}${c.unread ? `<span class="badge ${p.muted ? 'muted' : ''}">${c.unread}</span>` : p.unreadMark ? '<span class="badge dot ' + (p.muted ? 'muted' : '') + '"></span>' : p.pinned ? I.pin.replace('class="ic"', 'class="ic mini"') : ''}</div></div></div>`;
  }).join('');
  if (f) { const people = S.found.filter(u => u.id !== S.me.id); h += `<div class="sect">Люди</div>` + (people.length ? people.map(u => `<div class="item" data-user="${esc(u.id)}">${userAv(u)}<div class="mid"><div class="t">${esc(u.name)}${badges(u)}</div><div class="pv">${u.username ? '@' + esc(u.username) : ' '}</div></div></div>`).join('') : '<div class="sect" style="color:var(--muted)">Ничего не найдено</div>'); }
  el.innerHTML = h || `<div class="empty">Здесь пока пусто.<br>Нажмите на карандаш, чтобы начать чат.</div>`;
}
async function onListClick(e) {
  const it = e.target.closest('.item'); if (!it) return;
  if (it.dataset.chat) return openChat(it.dataset.chat);
  if (it.dataset.user) { try { const c = await api('/chats/open-private', { userId: it.dataset.user }); await loadChats(); $('#q').value = ''; S.filter = ''; S.found = []; renderList(); openChat(c.id); } catch (er) { fail(er); } }
}
function onListCtx(e) {
  const it = e.target.closest('[data-chat]'); if (!it) return; e.preventDefault();
  const c = chat(it.dataset.chat), p = prefs(c);
  const set = patch => api('/chats/prefs', { chatId: c.id, ...patch }).catch(fail);
  ctxMenu(e.clientX, e.clientY, [
    { icon: p.pinned ? 'unpin' : 'pin', label: p.pinned ? 'Открепить' : 'Закрепить', fn: () => set({ pinned: !p.pinned }) },
    { icon: p.muted ? 'bell' : 'mute', label: p.muted ? 'Включить уведомления' : 'Отключить уведомления', fn: () => set({ muted: !p.muted }) },
    { icon: 'archive', label: p.archived ? 'Вернуть из архива' : 'В архив', fn: () => set({ archived: !p.archived }) },
    !c.unread && !p.unreadMark ? { icon: 'check', label: 'Отметить непрочитанным', fn: () => set({ unreadMark: true }) } : null,
    (c.unread || p.unreadMark) ? { icon: 'check', label: 'Прочитано', fn: () => api('/chats/read', { chatId: c.id }).then(() => { c.unread = 0; renderList(); updateTitle(); }).catch(fail) } : null,
  ]);
}

async function openChat(id) {
  if (S.active) { const tx = $('#tx'); if (tx) S.drafts[S.active] = tx.value; }
  S.active = id; S.sel = null; S.reply = null; S.edit = null; S.attach = null; S.info = false; S.away = 0; stopRec(true);
  $('#app').classList.add('open');
  if (!S.msgs[id]) { try { const r = await api('/messages?chat=' + encodeURIComponent(id)); S.msgs[id] = r.messages; S.more[id] = r.hasMore; } catch (er) { fail(er); return; } }
  renderMain(); renderList(); markRead();
}
function statusText(c) {
  if (c.type === 'private' && c.peer) { const u = S.users[c.peer.id] || c.peer; return { t: fmtSeen(u), on: u.online }; }
  if (c.type === 'group') { const on = c.members.filter(m => (S.users[m.id] || m).online).length; return { t: `${c.members.length} участн., ${on} в сети` }; }
  if (c.type === 'channel') return { t: `${c.members.length} подписчик.` };
  if (c.type === 'service') return { t: 'служебные уведомления' };
  return { t: 'ваши заметки' };
}
const canWriteIn = c => c.type !== 'service' && !c.blocked && !(c.type === 'channel' && !c.admins.includes(S.me.id));
const isChatAdmin = c => c.admins.includes(S.me.id);

function renderMain() {
  const main = $('#main'); if (!main) return;
  const c = S.active && chat(S.active);
  if (!c) { main.innerHTML = `<div class="empty"><span>Выберите чат, чтобы начать общение</span></div>`; $('#app').classList.remove('open'); return; }
  const cw = canWriteIn(c);
  main.innerHTML = `<div id="hd"></div><div id="pb"></div><div class="msgs" id="ms"></div><div id="dn"></div><div class="cwrap"><div id="rb"></div></div>
    ${cw ? `<div class="cwrap"><div class="comp" id="cp"><div class="box"><button class="ico" id="bEm" title="Эмодзи">${I.smile}</button>
      <textarea id="tx" rows="1" placeholder="Сообщение" maxlength="4000"></textarea><button class="ico" id="bAt" title="Прикрепить файл">${I.attach}</button></div>
      <button class="send" id="bSend" title="Отправить"><span class="s">${I.send}</span><span class="m">${I.mic}</span></button><input type="file" id="fi" hidden></div></div>`
    : `<div class="note">${c.blocked ? 'Вы заблокировали этого пользователя · <a href="#" id="unb">Разблокировать</a>' : c.type === 'service' ? 'Это служебный чат LimeGram' : 'Писать в канал могут только администраторы'}</div>`}`;
  const info = S.info ? infoPanel(c) : '';
  renderHead(); renderPin(); renderMsgs(true); renderReplyBar();
  let ip = $('#ip'); if (info) { main.parentElement.querySelector('#ip')?.remove(); const d = document.createElement('div'); d.id = 'ip'; d.className = 'info'; d.innerHTML = info; bindInfo(d, c); $('#app').appendChild(d); } else $('#ip')?.remove();
  $('#unb')?.addEventListener('click', e => { e.preventDefault(); blockUser(c.peer.id, false); });
  const ms = $('#ms'); ms.onclick = onMsgClick; ms.oncontextmenu = onMsgCtx; ms.ondblclick = e => { const m = e.target.closest('.msg'); if (m && !e.target.closest('a,img,.rx,.vm')) startReply(m.dataset.id); };
  let tt; ms.ontouchstart = e => { const m = e.target.closest('.msg'); if (!m) return; const t = e.touches[0]; tt = setTimeout(() => showMsgMenu(m.dataset.id, t.clientX, t.clientY), 480); }; ms.ontouchend = ms.ontouchmove = () => clearTimeout(tt);
  ms.onscroll = async () => {
    const far = ms.scrollHeight - ms.scrollTop - ms.clientHeight; const dn = $('#dn');
    if (far > 300 && !dn.firstChild) dn.innerHTML = `<button class="down" id="bDn">${S.away ? `<b>${S.away}</b>` : ''}${I.down}</button>`, $('#bDn').onclick = () => { ms.scrollTo({ top: ms.scrollHeight }); };
    else if (far <= 300 && dn.firstChild) { dn.innerHTML = ''; S.away = 0; markRead(); }
    if (ms.scrollTop < 40 && S.more[c.id] && !ms._l) {
      ms._l = true;
      try { const first = S.msgs[c.id][0]; const h = ms.scrollHeight; const r = await api('/messages?chat=' + encodeURIComponent(c.id) + '&before=' + first.id); S.msgs[c.id] = r.messages.concat(S.msgs[c.id]); S.more[c.id] = r.hasMore; ms.style.scrollBehavior = 'auto'; renderMsgs(false); ms.scrollTop = ms.scrollHeight - h; ms.style.scrollBehavior = ''; } catch { }
      ms._l = false;
    }
  };
  main.ondragover = e => { e.preventDefault(); if (!$('.drop')) { const d = document.createElement('div'); d.className = 'drop'; d.textContent = 'Отпустите, чтобы прикрепить файл'; main.appendChild(d); } };
  main.ondragleave = e => { if (e.target === main || !main.contains(e.relatedTarget)) $('.drop')?.remove(); };
  main.ondrop = e => { e.preventDefault(); $('.drop')?.remove(); if (cw && e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); };
  if (cw) {
    const tx = $('#tx'), cp = $('#cp'); let last = 0;
    tx.value = S.drafts[c.id] || '';
    const sync = () => { tx.style.height = 'auto'; tx.style.height = Math.min(tx.scrollHeight, 150) + 'px'; cp.classList.toggle('has', !!tx.value.trim() || !!S.attach || !!S.edit); };
    tx.oninput = () => { sync(); if (Date.now() - last > 3000 && tx.value) { last = Date.now(); api('/chats/typing', { chatId: c.id }).catch(() => { }); } };
    tx.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && ((S.settings.sendMode === 'ctrl') === !!(e.ctrlKey || e.metaKey))) { e.preventDefault(); sendMsg(); } if (e.key === 'Escape') { S.reply = null; S.edit = null; renderReplyBar(); } if (e.key === 'ArrowUp' && !tx.value) { const mine = [...(S.msgs[c.id] || [])].reverse().find(m => m.from === S.me.id && m.text); if (mine) startEdit(mine.id); } };
    tx.onpaste = e => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); pickFile(f); } };
    cp.sync = sync; sync();
    $('#bSend').oncontextmenu = e => { e.preventDefault(); scheduleModal(c); };
    $('#bSend').onclick = () => { if (S.rec) stopRec(false); else if (tx.value.trim() || S.attach || S.edit) sendMsg(); else startRec(); };
    $('#bAt').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); ctxMenu(r.left - 150, r.top - 96, [{ icon: 'file', label: 'Файл или фото', fn: () => $('#fi').click() }, c.type !== 'saved' ? { icon: 'poll', label: 'Опрос', fn: () => pollModal(c) } : null]); }; $('#fi').onchange = e => { pickFile(e.target.files[0]); e.target.value = ''; };
    $('#bEm').onclick = toggleEmoji; tx.focus();
  }
}
function renderHead() {
  const c = chat(S.active), el = $('#hd'); if (!c || !el) return;
  if (S.sel) {
    el.innerHTML = `<div class="head sel"><button class="ico" id="sCx" title="Отмена">${I.close}</button><div class="mid"><div class="t">Выбрано: ${S.sel.size}</div></div><button class="ico" id="sCp" title="Копировать">${I.copy}</button><button class="ico" id="sFw" title="Переслать">${I.forward}</button><button class="ico" id="sDl" title="Удалить">${I.trash}</button></div>`;
    $('#sCx').onclick = clearSel;
    $('#sCp').onclick = () => { const t = selectedMsgs().filter(m => m.text).map(m => m.text).join('\n'); if (t) copyText(t); clearSel(); };
    $('#sFw').onclick = () => { if (c.type !== 'service') forwardMsgs(selectedMsgs()); };
    $('#sDl').onclick = () => deleteMsgs(c, selectedMsgs());
    return;
  }
  el.innerHTML = `<div class="head"><button class="ico back" id="bBack">${I.back}</button>${avatarHtml(c, 'sm')}
    <div class="mid" id="hm"><div class="t">${esc(title(c))}${c.type === 'private' && c.peer ? badges(S.users[c.peer.id] || c.peer) : ''}</div><div class="st" id="st"></div></div>
    <button class="ico" id="bSr" title="Поиск по чату">${I.search}</button><button class="ico" id="bIn" title="Информация">${I.info}</button><button class="ico" id="bMo">${I.more}</button></div>`;
  $('#bBack').onclick = () => { S.active = null; S.info = false; $('#ip')?.remove(); $('#app').classList.remove('open'); renderMain(); renderList(); };
  $('#hm').onclick = $('#bIn').onclick = () => { S.info = !S.info; renderMain(); };
  $('#bSr').onclick = () => openChatSearch(c);
  $('#bMo').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); const p = prefs(c); ctxMenu(r.left - 170, r.bottom + 4, [
    { icon: p.muted ? 'bell' : 'mute', label: p.muted ? 'Включить уведомления' : 'Отключить уведомления', fn: () => api('/chats/prefs', { chatId: c.id, muted: !p.muted }).catch(fail) },
    { icon: p.pinned ? 'unpin' : 'pin', label: p.pinned ? 'Открепить чат' : 'Закрепить чат', fn: () => api('/chats/prefs', { chatId: c.id, pinned: !p.pinned }).catch(fail) },
    { icon: 'archive', label: p.archived ? 'Вернуть из архива' : 'В архив', fn: () => api('/chats/prefs', { chatId: c.id, archived: !p.archived }).catch(fail) },
    { icon: 'clock', label: 'Автоудаление: ' + ttlLabel(c.ttl), fn: () => ttlModal(c) },
    { icon: 'send', label: 'Отложенные сообщения', fn: () => scheduleModal(c) },
    { icon: 'trash', label: 'Очистить историю', fn: () => clearHistory(c) },
    c.type === 'private' && c.peer ? { icon: 'ban', label: c.blocked ? 'Разблокировать' : 'Заблокировать', red: !c.blocked, fn: () => blockUser(c.peer.id, !c.blocked) } : null,
    (c.type === 'group' || c.type === 'channel') ? { icon: 'logout', label: c.type === 'group' ? 'Покинуть группу' : 'Покинуть канал', red: true, fn: () => leaveChat(c) } : null]); };
  renderStatus();
}
async function leaveChat(c) { if (await confirmBox('Покинуть «' + c.title + '»?', 'Покинуть', true)) { try { await api('/chats/members', { chatId: c.id, action: 'leave' }); S.active = null; S.info = false; await loadChats(); renderMain(); } catch (er) { fail(er); } } }
function renderStatus() {
  const c = chat(S.active); const el = $('#st'); if (!c || !el) return;
  const typers = Object.keys(S.typing).filter(k => k.startsWith(c.id + ':')).map(k => S.users[k.split(':')[1]]?.name?.split(' ')[0]).filter(Boolean);
  if (typers.length) { el.className = 'st on'; el.innerHTML = esc((c.type === 'private' ? '' : typers.join(', ') + ' ') + 'печатает') + '<span class="dots"><i></i><i></i><i></i></span>'; return; }
  const s = statusText(c); el.className = 'st' + (s.on ? ' on' : ''); el.textContent = s.t;
}
function renderPin() {
  const c = chat(S.active), el = $('#pb'); if (!c || !el) return;
  const m = c.pinned && (S.msgs[c.id] || []).find(x => x.id === c.pinned);
  if (!c.pinned) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="pinbar"><div class="ln"></div><div class="mid"><b>Закреплённое сообщение</b><span>${esc(m ? previewOf(m) : '…')}</span></div><button class="ico" id="bUp" title="Открепить">${I.close}</button></div>`;
  $('.pinbar', el).onclick = e => { if (e.target.closest('#bUp')) return; goTo(c.pinned); };
  $('#bUp', el).onclick = () => { if (c.type === 'group' || c.type === 'channel' ? isChatAdmin(c) : true) api('/chats/pin', { chatId: c.id, id: '' }).catch(fail); else el.innerHTML = ''; };
}
async function goTo(id) {
  let t = $(`.msg[data-id="${CSS.escape(id)}"]`);
  if (!t) { try { const r = await api('/messages?chat=' + encodeURIComponent(S.active) + '&before=' + (Number(id) + 1)); S.msgs[S.active] = r.messages; S.more[S.active] = r.hasMore; renderMsgs(false); t = $(`.msg[data-id="${CSS.escape(id)}"]`); } catch (er) { return fail(er); } }
  if (t) { t.scrollIntoView({ block: 'center' }); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
}

function renderMsgs(toBottom) {
  const c = chat(S.active); const ms = $('#ms'); if (!c || !ms) return;
  const list = S.msgs[c.id] || [];
  const stick = toBottom || ms.scrollHeight - ms.scrollTop - ms.clientHeight < 140;
  let h = '<div class="wrap' + (S.sel ? ' selecting' : '') + '">', lastDay = '';
  list.forEach((m, i) => {
    const d = fmtDay(m.ts); if (d !== lastDay) { h += `<div class="day">${esc(d)}</div>`; lastDay = d; }
    h += msgHtml(m, c, list[i - 1], list[i + 1]);
  });
  ms.innerHTML = h + '</div>';
  if (stick) { ms.style.scrollBehavior = 'auto'; ms.scrollTop = ms.scrollHeight; ms.style.scrollBehavior = ''; }
  if (S.fresh.size) setTimeout(() => S.fresh.clear(), 400);
}
function senderName(id) { return id === '0' ? 'LimeGram' : (id === S.me.id ? 'Вы' : (S.users[id]?.name || 'Пользователь')); }
const waveBars = id => { let s = Number(id) || 7, h = ''; for (let i = 0; i < 30; i++) { s = (s * 9301 + 49297) % 233280; h += `<i style="height:${25 + (s / 233280) * 75}%"></i>`; } return h; };
const votesWord = n => (n % 10 === 1 && n % 100 !== 11) ? 'голос' : ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) ? 'голоса' : 'голосов';
function pollBlock(m) {
  const p = m.poll, tot = p.total || 0, voted = p.opts.some(o => o.mine), show = voted || p.closed;
  const kind = (p.anon ? 'Анонимный опрос' : 'Опрос') + (p.multi ? ' · несколько ответов' : '') + (p.closed ? ' · завершён' : '');
  return `<div class="poll"><div class="pq">${esc(p.q)}</div><div class="pt">${kind}</div>${p.opts.map((o, i) => {
    const pc = tot ? Math.round(o.n * 100 / tot) : 0;
    const who = o.voters && o.voters.length ? ' title="' + esc(o.voters.map(senderName).join(', ')) + '"' : '';
    return `<button class="po ${o.mine ? 'mine' : ''}" data-po="${i}"${who} ${p.closed ? 'disabled' : ''}><span class="pk">${p.multi ? (o.mine ? '☑' : '☐') : (o.mine ? '◉' : '○')}</span><span class="pl2"><span class="ptx">${esc(o.t)}</span>${show ? `<i class="pb"><b style="width:${pc}%"></b></i>` : ''}</span>${show ? `<span class="pp">${pc}%</span>` : ''}</button>`;
  }).join('')}<div class="pf">${tot ? tot + ' ' + votesWord(tot) : 'Пока никто не голосовал'}</div></div>`;
}
function msgHtml(m, c, prev, next) {
  const mine = m.from === S.me.id, list = S.msgs[c.id] || [];
  const rep = m.replyTo && list.find(x => x.id === m.replyTo);
  let att = '';
  if (m.attach) {
    const a = m.attach, t = String(a.type), ok = String(a.data).startsWith('data:');
    if (t.startsWith('image/') && ok) att = `<img class="pic" src="${esc(a.data)}" alt="${esc(a.name)}" data-img="1">`;
    else if (t.startsWith('video/') && ok) att = `<video class="pic" src="${esc(a.data)}" controls preload="metadata"></video>`;
    else if (t.startsWith('audio/') && ok) att = `<div class="vm" data-vm="${esc(m.id)}"><button class="pl" data-play="${esc(m.id)}">${I.play}</button><div class="wv" data-seek="${esc(m.id)}">${waveBars(m.id)}</div><span class="du">${fmtDur(a.dur || 0)}</span></div>`;
    else att = `<a class="file" download="${esc(a.name)}" href="${esc(a.data)}"><span class="fi">${I.file}</span><span><b>${esc(a.name)}</b><small>${ok ? fmtSize(a.data.length * 0.75) : ''}</small></span></a>`;
  }
  const read = m.readBy && m.readBy.some(x => x !== S.me.id);
  const ticks = mine && c.type !== 'saved' ? `<span class="${read ? 'rd' : ''}">${read ? I.checks : I.check}</span>` : '';
  const cont = next && next.from === m.from && next.ts - m.ts < 180000 && fmtDay(next.ts) === fmtDay(m.ts);
  const first = !prev || prev.from !== m.from || m.ts - prev.ts > 180000 || fmtDay(prev.ts) !== fmtDay(m.ts);
  const showName = !mine && c.type === 'group' && first;
  let rx = '';
  const rr = m.reactions && Object.entries(m.reactions);
  if (rr && rr.length) rx = `<div class="rx">${rr.map(([e, w]) => `<button data-rx="${esc(e)}" class="${w.includes(S.me.id) ? 'mine' : ''}"><span>${e}</span>${w.length}</button>`).join('')}</div>`;
  const big = !m.attach && !m.replyTo && !m.fwd && isEmojiOnly(m.text);
  return `<div class="msg ${mine ? 'me' : ''} ${cont ? 'cont' : ''} ${S.fresh.has(m.id) ? 'new' : ''} ${S.sel && S.sel.has(m.id) ? 'picked' : ''}" data-id="${esc(m.id)}"><div class="bub">
    ${showName ? `<div class="who" data-who="${esc(m.from)}">${esc(senderName(m.from))}${badges(S.users[m.from] || {})}</div>` : ''}
    ${m.fwd ? `<div class="fwd">Переслано от ${esc(m.fwd.name || 'пользователя')}</div>` : ''}
    ${rep ? `<div class="quote" data-goto="${esc(rep.id)}"><b>${esc(senderName(rep.from))}</b><span>${esc(previewOf(rep).slice(0, 90))}</span></div>` : ''}
    ${att}${m.poll && m.poll.opts ? pollBlock(m) : ''}${m.gift ? giftMsgHtml(m) : m.text ? `<div class="tx ${big ? 'big' : ''}">${formatText(m.text)}${m.dice ? `<small class="dv">выпало ${m.dice}</small>` : ''}</div>` : ''}${rx}
    <div class="meta">${c.pinned === m.id ? I.pin.replace('class="ic"', 'class="ic" style="width:13px;height:13px"') : ''}${m.expires ? '⏱ ' : ''}${m.edited ? 'изм. ' : ''}${fmtTime(m.ts)}${ticks}</div></div></div>`;
}

/* ---------- Действия с сообщениями ---------- */
function startReply(id) { const m = (S.msgs[S.active] || []).find(x => x.id === id); const c = chat(S.active); if (!m || !c || !canWriteIn(c)) return; S.reply = m; S.edit = null; renderReplyBar(); $('#tx')?.focus(); }
function startEdit(id) { const m = (S.msgs[S.active] || []).find(x => x.id === id); if (!m) return; S.edit = m; S.reply = null; renderReplyBar(); const tx = $('#tx'); tx.value = m.text; tx.focus(); $('#cp').sync(); }
function onMsgCtx(e) { const m = e.target.closest('.msg'); if (!m) return; e.preventDefault(); showMsgMenu(m.dataset.id, e.clientX, e.clientY); }
function showMsgMenu(id, x, y) {
  const c = chat(S.active); const m = (S.msgs[c.id] || []).find(z => z.id === id); if (!m) return;
  const mine = m.from === S.me.id, canPin = c.type === 'group' || c.type === 'channel' ? isChatAdmin(c) : c.type !== 'service';
  const top = c.type === 'service' ? '' : `<div class="rxs">${REACTS.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>`;
  const menu = ctxMenu(x, y, [
    canWriteIn(c) ? { icon: 'reply', label: 'Ответить', fn: () => startReply(id) } : null,
    m.text ? { icon: 'copy', label: 'Копировать текст', fn: () => copyText(m.text) } : null,
    canPin ? { icon: c.pinned === id ? 'unpin' : 'pin', label: c.pinned === id ? 'Открепить' : 'Закрепить', fn: () => api('/chats/pin', { chatId: c.id, id: c.pinned === id ? '' : id }).catch(fail) } : null,
    c.type !== 'service' ? { icon: 'forward', label: 'Переслать', fn: () => forwardMsg(m) } : null,
    mine && c.type !== 'service' ? { icon: 'edit', label: 'Изменить', fn: () => startEdit(id) } : null,
    m.poll && m.poll.opts && !m.poll.closed && (mine || isChatAdmin(c)) ? { icon: 'check', label: 'Завершить опрос', fn: () => api('/messages/poll-close', { chatId: c.id, id }).catch(fail) } : null,
    { icon: 'checks', label: 'Выбрать', fn: () => startSelect(id) },
    { icon: 'trash', label: 'Удалить', red: true, fn: () => deleteMsgs(c, [m]) },
  ], top);
  m && menu.querySelector('.rxs')?.addEventListener('click', ev => { const b = ev.target.closest('[data-e]'); if (b) { closeCtx(); react(id, b.dataset.e); } });
}
function react(id, emoji) { const m = (S.msgs[S.active] || []).find(z => z.id === id); const has = m?.reactions?.[emoji]?.includes(S.me.id); api('/messages/react', { chatId: S.active, id, emoji, remove: !!has }).catch(fail); }
function forwardMsg(m) { forwardMsgs([m]); }
function forwardMsgs(msgs) {
  const mb = modal(`<div class="mh"><h2>Переслать${msgs.length > 1 ? ' (' + msgs.length + ')' : ''}</h2><button class="ico" id="cx">${I.close}</button></div><div id="fl">${S.chats.filter(c => canWriteIn(c)).map(c => `<div class="item" data-c="${esc(c.id)}">${avatarHtml(c, 'sm')}<div class="mid"><div class="t">${esc(title(c))}</div></div></div>`).join('')}</div>`);
  $('#cx', mb).onclick = mb.close;
  $('#fl', mb).onclick = async e => {
    const it = e.target.closest('[data-c]'); if (!it) return;
    try {
      for (const m of msgs) {
        if (m.poll) continue;   // опросы не пересылаются
        const body = { chatId: it.dataset.c, text: m.text || '', fwd: { name: senderName(m.from), from: m.from } };
        if (m.attach) { const full = (S.msgs[S.active] || []).find(z => z.id === m.id); body.attach = { name: full.attach.name, type: full.attach.type, data: full.attach.data, dur: full.attach.dur }; }
        if (!body.text && !body.attach) continue;
        await api('/messages/send', body);
      }
      mb.close(); clearSel(); toast(msgs.length > 1 ? 'Сообщения пересланы' : 'Сообщение переслано');
    } catch (er) { fail(er); }
  };
}
/* ---------- Выбор нескольких сообщений ---------- */
function startSelect(id) { S.sel = new Set([id]); renderHead(); renderMsgs(false); }
function clearSel() { if (!S.sel) return; S.sel = null; renderHead(); renderMsgs(false); }
function selectedMsgs() { const l = S.msgs[S.active] || []; return l.filter(m => S.sel && S.sel.has(m.id)); }
function toggleSel(id) { if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); if (!S.sel.size) S.sel = null; renderHead(); renderMsgs(false); }
async function deleteMsgs(c, msgs) {
  const canAll = msgs.every(m => m.from === S.me.id || isChatAdmin(c) || S.me.isAdmin), box = canAll && c.type !== 'saved';
  const mb = modal(`<div class="mh"><h2>${msgs.length > 1 ? 'Удалить сообщения (' + msgs.length + ')?' : 'Удалить сообщение?'}</h2></div>${box ? '<label class="chk"><input type="checkbox" id="dall" checked> Удалить для всех</label>' : ''}<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn small ghost" id="n">Отмена</button><button class="btn small danger" id="y" style="color:var(--danger)">Удалить</button></div>`);
  $('#n', mb).onclick = mb.close; $('#y', mb).focus();
  $('#y', mb).onclick = async () => {
    const forMe = !canAll || (box && !$('#dall', mb).checked); mb.close();
    try { for (const m of msgs) await api('/messages/delete', { chatId: c.id, id: m.id, forMe }); clearSel(); } catch (er) { fail(er); }
  };
}
function pollModal(c) {
  const mb = modal(`<div class="mh"><h2>Новый опрос</h2><button class="ico" id="cx">${I.close}</button></div>
    <label class="field">Вопрос<input id="pq" maxlength="255" autocomplete="off"></label>
    <div id="po">${[1, 2].map(n => `<label class="field"><input class="popt" maxlength="100" placeholder="Вариант ${n}" autocomplete="off"></label>`).join('')}</div>
    <button class="btn small ghost" id="pa">+ Добавить вариант</button>
    <label class="chk"><input type="checkbox" id="pn"> Анонимное голосование</label><label class="chk"><input type="checkbox" id="pm"> Несколько ответов</label>
    <div class="err" id="pe"></div><button class="btn" id="ps">Создать опрос</button>`);
  $('#cx', mb).onclick = mb.close; $('#pq', mb).focus();
  $('#pa', mb).onclick = () => { const n = $$('.popt', mb).length; if (n >= 10) return; const l = document.createElement('label'); l.className = 'field'; l.innerHTML = `<input class="popt" maxlength="100" placeholder="Вариант ${n + 1}" autocomplete="off">`; $('#po', mb).appendChild(l); l.firstChild.focus(); if (n + 1 >= 10) $('#pa', mb).style.display = 'none'; };
  $('#ps', mb).onclick = async () => {
    const q = $('#pq', mb).value.trim(), opts = $$('.popt', mb).map(x => x.value.trim()).filter(Boolean);
    if (!q) return $('#pe', mb).textContent = 'Введите вопрос'; if (opts.length < 2) return $('#pe', mb).textContent = 'Нужно минимум два варианта ответа';
    try { await api('/messages/send', { chatId: c.id, text: '', poll: { q, opts, multi: $('#pm', mb).checked, anon: $('#pn', mb).checked } }); mb.close(); } catch (er) { $('#pe', mb).textContent = er.message; }
  };
}
async function blockUser(id, blocked) {
  if (blocked && !(await confirmBox('Заблокировать пользователя? Вы не сможете переписываться.', 'Заблокировать', true))) return;
  try { await api('/users/block', { userId: id, blocked }); toast(blocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован'); await loadChats(); if (S.active) renderMain(); } catch (er) { fail(er); }
}
async function clearHistory(c) { if (await confirmBox('Очистить историю у себя? У других участников сообщения останутся.', 'Очистить', true)) api('/chats/clear', { chatId: c.id }).catch(fail); }
async function joinByLink(code, mb) { try { const c = await api('/chats/join', { code }); if (mb) mb.close(); await loadChats(); openChat(c.id); toast('Вы вступили в «' + c.title + '»'); } catch (er) { fail(er); } }
async function inviteModal(c) {
  let r; try { r = await api('/chats/invite', { chatId: c.id }); } catch (er) { return fail(er); }
  const mb = modal(`<div class="mh"><h2>Ссылка-приглашение</h2><button class="ico" id="cx">${I.close}</button></div><div class="kv" style="padding:6px 0"><small style="color:var(--muted)">Отправьте ссылку: по ней можно вступить в «${esc(c.title)}»</small><input id="lk" readonly value="${esc(r.link)}" style="width:100%;margin-top:8px"></div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn small" id="cp" style="flex:1">Копировать</button><button class="btn small ghost" id="rv" style="flex:1">Сбросить ссылку</button></div>`);
  $('#cx', mb).onclick = mb.close; $('#lk', mb).onfocus = e => e.target.select();
  $('#cp', mb).onclick = () => copyText($('#lk', mb).value);
  $('#rv', mb).onclick = async () => { if (!(await confirmBox('Старая ссылка перестанет работать. Сбросить?', 'Сбросить', true))) return; try { const n = await api('/chats/invite', { chatId: c.id, action: 'revoke' }); $('#lk', mb).value = n.link; toast('Создана новая ссылка'); } catch (er) { fail(er); } };
}
async function onMsgClick(e) {
  const c = chat(S.active); if (!c) return;
  if (S.sel) { const mm = e.target.closest('.msg'); if (mm) { e.preventDefault(); toggleSel(mm.dataset.id); } return; }
  const jn = e.target.closest('[data-join]'); if (jn) { e.preventDefault(); if (await confirmBox('Вступить в чат по этой ссылке?', 'Вступить')) joinByLink(jn.dataset.join); return; }
  const mn = e.target.closest('[data-mention]'); if (mn) {
    const nm = mn.dataset.mention.toLowerCase();
    if ((S.me.username || '').toLowerCase() === nm) return openUserInfo(S.me.id);
    try { const r = await api('/users/search?q=' + encodeURIComponent('@' + nm)); const u = r.find(x => (x.username || '').toLowerCase() === nm); if (u) openUserInfo(u.id); else toast('Пользователь @' + mn.dataset.mention + ' не найден', true); } catch (er) { fail(er); }
    return;
  }
  const po = e.target.closest('[data-po]'); if (po && !po.disabled) {
    const id = po.closest('.msg').dataset.id, m = (S.msgs[c.id] || []).find(x => x.id === id), i = +po.dataset.po; if (!m || !m.poll) return;
    let sel = m.poll.opts.map((o, k) => o.mine ? k : -1).filter(k => k >= 0);
    if (m.poll.multi) sel = sel.includes(i) ? sel.filter(k => k !== i) : [...sel, i]; else sel = sel.includes(i) ? [] : [i];
    api('/messages/vote', { chatId: c.id, id, options: sel }).catch(fail); return;
  }
  const q = e.target.closest('[data-goto]'); if (q) return goTo(q.dataset.goto);
  const sp = e.target.closest('.sp'); if (sp) return sp.classList.toggle('open');
  const im = e.target.closest('[data-img]'); if (im) { const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<img src="${esc(im.src)}" alt="">`; lb.onclick = () => lb.remove(); document.body.appendChild(lb); return; }
  const rx = e.target.closest('[data-rx]'); if (rx) return react(rx.closest('.msg').dataset.id, rx.dataset.rx);
  const pl = e.target.closest('[data-play]'); if (pl) return playVoice(pl.dataset.play);
  const sk = e.target.closest('[data-seek]'); if (sk) { const r = sk.getBoundingClientRect(); return playVoice(sk.dataset.seek, (e.clientX - r.left) / r.width); }
  const w = e.target.closest('[data-who]'); if (w) return openUserInfo(w.dataset.who);
}

/* ---------- Голосовые ---------- */
let voice = { id: null, a: null };
function playVoice(id, seek) {
  const m = (S.msgs[S.active] || []).find(x => x.id === id); if (!m) return;
  if (voice.id === id && voice.a && seek === undefined) { voice.a.paused ? voice.a.play() : voice.a.pause(); return; }
  if (voice.a) { voice.a.pause(); paintVoice(voice.id, 0, false); }
  const a = new Audio(m.attach.data); voice = { id, a };
  const dur = () => (isFinite(a.duration) && a.duration > 0 ? a.duration : m.attach.dur || 1);
  a.onloadedmetadata = () => { if (seek !== undefined) a.currentTime = seek * dur(); };
  a.ontimeupdate = () => paintVoice(id, a.currentTime / dur(), !a.paused, a.currentTime);
  a.onplay = () => paintVoice(id, a.currentTime / dur(), true, a.currentTime); a.onpause = () => paintVoice(id, a.currentTime / dur(), false, a.currentTime);
  a.onended = () => { paintVoice(id, 0, false); voice = { id: null, a: null }; };
  a.play().catch(() => toast('Не удалось воспроизвести', true));
}
function paintVoice(id, frac, playing, t) {
  const el = $(`[data-vm="${CSS.escape(id)}"]`); if (!el) return;
  el.classList.toggle('playing', playing); $('.pl', el).innerHTML = playing ? I.pause : I.play;
  const bars = $$('.wv i', el), n = Math.round(frac * bars.length); bars.forEach((b, i) => b.classList.toggle('on', i < n));
  if (t !== undefined) $('.du', el).textContent = fmtDur(t);
}
async function startRec() {
  const c = chat(S.active); if (!c) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: S.settings.audioIn ? { deviceId: S.settings.audioIn } : true });
    const mr = new MediaRecorder(stream), chunks = []; const t0 = Date.now();
    const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 64; ac.createMediaStreamSource(stream).connect(an);
    S.rec = { mr, stream, ac, chunks, t0, cancel: false, chat: c.id };
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop()); ac.close().catch(() => { }); const r = S.rec; clearInterval(r.iv); cancelAnimationFrame(r.raf); S.rec = null; renderRec();
      if (r.cancel || Date.now() - r.t0 < 600) return;
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      if (blob.size > maxFile()) return toast('Голосовое слишком длинное (макс. ' + (maxFile() >> 20) + ' МБ)', true);
      const data = await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(blob); });
      try { await api('/messages/send', { chatId: r.chat, text: '', attach: { name: 'voice.webm', type: 'audio/webm', data, dur: Math.round((Date.now() - r.t0) / 1000) } }); } catch (er) { fail(er); }
    };
    mr.start(); renderRec();
    S.rec.iv = setInterval(() => { const t = $('.rec .tm'); if (t) t.textContent = fmtDur((Date.now() - t0) / 1000); if (Date.now() - t0 > 180000) stopRec(false); }, 250);
    const buf = new Uint8Array(an.frequencyBinCount); const loop = () => { if (!S.rec) return; an.getByteFrequencyData(buf); $$('.rec .lv i').forEach((b, i) => { b.style.height = Math.max(12, buf[i % buf.length] / 2.6) + '%'; }); S.rec.raf = requestAnimationFrame(loop); }; loop();
  } catch { toast('Нет доступа к микрофону', true); }
}
function stopRec(cancel) { if (S.rec && S.rec.mr.state !== 'inactive') { S.rec.cancel = cancel; S.rec.mr.stop(); } else if (S.rec) S.rec = null; }
function renderRec() {
  const cp = $('#cp'); if (!cp) return;
  if (S.rec) { cp.querySelector('.box').style.display = 'none'; if (!$('.rec', cp)) { const r = document.createElement('div'); r.className = 'rec'; r.innerHTML = `<button class="ico" id="rx" title="Отмена">${I.trash2}</button><i class="rd"></i><span class="tm">0:00</span><div class="lv">${'<i></i>'.repeat(26)}</div>`; cp.insertBefore(r, cp.firstChild); $('#rx', r).onclick = () => stopRec(true); } cp.classList.add('has'); }
  else { $('.rec', cp)?.remove(); cp.querySelector('.box').style.display = ''; cp.sync?.(); }
}

function renderReplyBar() {
  const el = $('#rb'); if (!el) return;
  const m = S.edit || S.reply, a = S.attach; let h = '';
  if (m) h += `<div class="bar">${S.edit ? I.edit : I.reply}<div class="bt"><b>${S.edit ? 'Редактирование' : 'Ответ ' + esc(senderName(m.from))}</b><span>${esc(previewOf(m))}</span></div><button class="ico" id="xr">${I.close}</button></div>`;
  if (a) h += `<div class="bar">${I.file}<div class="bt"><b>Вложение</b><span>${esc(a.name)}</span></div><button class="ico" id="xa">${I.close}</button></div>`;
  el.innerHTML = h;
  $('#xr') && ($('#xr').onclick = () => { if (S.edit && $('#tx')) $('#tx').value = ''; S.reply = S.edit = null; renderReplyBar(); });
  $('#xa') && ($('#xa').onclick = () => { S.attach = null; renderReplyBar(); });
  $('#cp')?.sync?.();
}
function pickFile(f) {
  if (!f) return; if (f.size > maxFile()) return toast('Файл слишком большой (макс. ' + (maxFile() >> 20) + ' МБ' + (S.me.premium ? '' : ', с LimeGram Premium — 5 МБ') + ')', true);
  const r = new FileReader(); r.onload = () => { S.attach = { name: f.name || 'файл', type: f.type || 'application/octet-stream', data: r.result }; renderReplyBar(); $('#tx')?.focus(); }; r.readAsDataURL(f);
}
async function sendMsg() {
  const c = chat(S.active); const tx = $('#tx'); if (!c || !tx) return;
  const text = tx.value.trim();
  try {
    if (S.edit) { if (!text && !S.edit.attach) return; await api('/messages/edit', { chatId: c.id, id: S.edit.id, text }); S.edit = null; }
    else {
      if (!text && !S.attach) return;
      const body = { chatId: c.id, text, replyTo: S.reply ? S.reply.id : null }; if (S.attach) body.attach = S.attach;
      tx.value = ''; delete S.drafts[c.id]; const att = S.attach, rep = S.reply; S.attach = null; S.reply = null; renderReplyBar();
      try { await api('/messages/send', body); } catch (er) { tx.value = text; S.attach = att; S.reply = rep; renderReplyBar(); throw er; }
    }
    tx.value = ''; tx.style.height = 'auto'; renderReplyBar();
  } catch (er) { fail(er); }
}
function toggleEmoji() {
  const old = $('.emojis'); if (old) return old.remove();
  const d = document.createElement('div'); d.className = 'emojis'; const keys = Object.keys(EMO); let cur = keys[0];
  const draw = () => { d.innerHTML = `<div class="tabs">${keys.map(k => `<button data-k="${k}" class="${k === cur ? 'on' : ''}">${k}</button>`).join('')}</div><div class="grid">${EMO[cur].map(x => `<button type="button">${x}</button>`).join('')}</div>`; };
  d.onclick = e => { const k = e.target.closest('[data-k]'); if (k) { cur = k.dataset.k; return draw(); } const b = e.target.closest('.grid button'); if (b) { const tx = $('#tx'); const p = tx.selectionStart ?? tx.value.length; tx.value = tx.value.slice(0, p) + b.textContent + tx.value.slice(p); tx.focus(); tx.selectionStart = tx.selectionEnd = p + b.textContent.length; tx.oninput(); } };
  draw(); $('#cp').appendChild(d);
  setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!d.contains(e.target) && !e.target.closest('#bEm')) { d.remove(); } if (!d.isConnected || !d.contains(e.target)) document.removeEventListener('mousedown', f); }));
}
function markRead() {
  const c = chat(S.active);
  if (c && !document.hidden && (c.unread || prefs(c).unreadMark)) { c.unread = 0; c.mentions = 0; if (c.prefs) c.prefs.unreadMark = false; renderList(); updateTitle(); api('/chats/read', { chatId: c.id }).catch(() => { }); }
}
document.addEventListener('visibilitychange', markRead);
function updateTitle() { const n = S.chats.reduce((a, c) => a + (prefs(c).muted ? 0 : (c.unread || 0)), 0); document.title = (n ? `(${n}) ` : '') + 'LimeGram'; }

/* ---------- Поиск по чату ---------- */
function openChatSearch(c) {
  const mb = modal(`<div class="mh"><h2>Поиск в «${esc(title(c))}»</h2><button class="ico" id="cx">${I.close}</button></div><label class="field"><input id="si" placeholder="Текст сообщения" autocomplete="off"></label><div id="sr"></div>`);
  $('#cx', mb).onclick = mb.close; let tm;
  $('#si', mb).oninput = e => { clearTimeout(tm); tm = setTimeout(async () => { try { const r = await api('/messages/search?chat=' + encodeURIComponent(c.id) + '&q=' + encodeURIComponent(e.target.value)); $('#sr', mb).innerHTML = r.length ? r.map(m => `<div class="item" data-m="${esc(m.id)}"><div class="mid"><div class="row"><span class="t">${esc(senderName(m.from))}</span><span class="time">${fmtList(m.ts)}</span></div><div class="pv">${esc(m.text.slice(0, 100))}</div></div></div>`).join('') : '<div class="empty" style="padding:20px">Ничего не найдено</div>'; } catch { } }, 250); };
  $('#sr', mb).onclick = e => { const it = e.target.closest('[data-m]'); if (it) { mb.close(); goTo(it.dataset.m); } };
  $('#si', mb).focus();
}

/* ---------- Информация о чате / человеке ---------- */
function infoPanel(c) {
  const p = c.type === 'private' && c.peer ? (S.users[c.peer.id] || c.peer) : null;
  let h = `<div class="mh" style="padding:10px 14px;margin:0"><h2>Информация</h2><button class="ico" id="ipx">${I.close}</button></div><div class="ph">${avatarHtml(c, 'lg')}<h3>${esc(title(c))}${p ? badges(p) : ''}</h3><small>${esc(statusText(c).t)}</small></div>`;
  if (p) { if (p.username) h += `<div class="kv"><small>Имя пользователя</small>@${esc(p.username)}</div>`; if (p.bio) h += `<div class="kv"><small>О себе</small>${esc(p.bio)}</div>`; }
  if (c.about) h += `<div class="kv"><small>Описание</small>${esc(c.about)}</div>`;
  if (c.type === 'group' || c.type === 'channel') {
    if (isChatAdmin(c)) h += `<div class="kv"><button class="btn small ghost" id="ied" style="width:100%">Изменить название и описание</button></div><div class="kv"><button class="btn small ghost" id="iinv" style="width:100%">Ссылка-приглашение</button></div>`;
    h += `<div class="sect">${c.type === 'group' ? 'Участники' : 'Подписчики'} · ${c.members.length}</div>`;
    if (isChatAdmin(c)) h += `<div class="item" id="iadd"><div class="av sm" style="background:var(--primary)">${I.plus}</div><div class="mid"><div class="t" style="color:var(--primary)">Добавить участника</div></div></div>`;
    h += c.members.map(m => { const u = S.users[m.id] || m; return `<div class="item" data-mem="${esc(m.id)}">${userAv(u, 'sm')}<div class="mid"><div class="t">${esc(u.name)}${badges(u)}</div><div class="pv">${c.owner === m.id ? 'владелец' : c.admins.includes(m.id) ? 'админ' : fmtSeen(u)}</div></div></div>`; }).join('');
    h += `<div class="kv"><button class="btn small danger" id="ilv" style="width:100%">${c.type === 'group' ? 'Покинуть группу' : 'Покинуть канал'}</button></div>`;
  }
  h += `<div class="kv"><button class="btn small ghost" id="icl" style="width:100%">Очистить историю</button></div>`;
  if (p) h += `<div class="kv"><button class="btn small ${c.blocked ? 'ghost' : 'danger'}" id="ibl" style="width:100%">${c.blocked ? 'Разблокировать' : 'Заблокировать'}</button></div>`;
  return h;
}
function bindInfo(d, c) {
  $('#ipx', d).onclick = () => { S.info = false; $('#ip')?.remove(); };
  $('#ied', d)?.addEventListener('click', () => editChatModal(c));
  $('#iadd', d)?.addEventListener('click', () => addMembersModal(c));
  $('#ilv', d)?.addEventListener('click', () => leaveChat(c));
  $('#iinv', d)?.addEventListener('click', () => inviteModal(c));
  $('#icl', d)?.addEventListener('click', () => clearHistory(c));
  $('#ibl', d)?.addEventListener('click', () => blockUser(c.peer.id, !c.blocked));
  d.addEventListener('click', e => { const it = e.target.closest('[data-mem]'); if (it) openUserInfo(it.dataset.mem, c); });
  d.addEventListener('contextmenu', e => {
    const it = e.target.closest('[data-mem]'); if (!it || !isChatAdmin(c)) return; e.preventDefault(); const id = it.dataset.mem; if (id === S.me.id || id === c.owner) return;
    const act = a => api('/chats/members', { chatId: c.id, action: a, userId: id }).catch(fail);
    ctxMenu(e.clientX, e.clientY, [c.owner === S.me.id ? (c.admins.includes(id) ? { icon: 'user', label: 'Снять админа', fn: () => act('demote') } : { icon: 'shield', label: 'Сделать админом', fn: () => act('promote') }) : null, { icon: 'ban', label: 'Исключить', red: true, fn: () => act('remove') }]);
  });
}
async function openUserInfo(id, ctxChat) {
  await catalog().catch(() => { });
  let u; try { u = await api('/users/info?id=' + encodeURIComponent(id)); cacheUsers([u]); } catch (er) { return fail(er); }
  const pc = S.chats.find(x => x.type === 'private' && x.peer && x.peer.id === id), isBl = !!(pc && pc.blocked);
  const mb = modal(`<div class="mh"><h2>Профиль</h2><button class="ico" id="cx">${I.close}</button></div><div class="ph" style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">${userAv(u, 'lg')}<h3 style="margin:6px 0 0;font-size:19px">${esc(u.name)}${badges(u)}</h3><small style="color:var(--muted)">${esc(fmtSeen(u))}</small></div>
    ${u.username ? `<div class="kv" style="padding:10px 0"><small style="color:var(--muted)">Имя пользователя</small>@${esc(u.username)}</div>` : ''}${u.bio ? `<div class="kv" style="padding:10px 0"><small style="color:var(--muted)">О себе</small>${esc(u.bio)}</div>` : ''}
    ${(u.gifts && u.gifts.length) ? `<div class="kv" style="padding:10px 0"><small style="color:var(--muted)">Подарки</small><div class="gift-row" style="margin-top:6px">${u.gifts.slice(0, 20).map(g => { const c = giftOf(g.gift); return `<div class="gcard own" style="--c1:${c.c1 || '#60a5fa'};--c2:${c.c2 || '#1d4ed8'}" title="${esc(c.name)}">${g.total ? `<i class="gl">№${g.num} из ${fmtN(g.total)}</i>` : ''}<span class="ge">${c.emoji}</span></div>`; }).join('')}</div></div>` : ''}
    ${id !== S.me.id ? '<button class="btn" id="wr" style="margin-top:8px">Написать сообщение</button><button class="btn ghost" id="gfb" style="margin-top:8px">🎁 Подарить подарок</button>' : ''}
    ${id !== S.me.id ? `<button class="btn ghost" id="bk" style="margin-top:8px;${isBl ? '' : 'color:var(--danger)'}">${isBl ? 'Разблокировать' : 'Заблокировать'}</button>` : ''}`);

  $('#cx', mb).onclick = mb.close;
  $('#bk', mb)?.addEventListener('click', () => { mb.close(); blockUser(id, !isBl); });
  $('#gfb', mb)?.addEventListener('click', () => { mb.close(); openGifts(u); });
  $('#wr', mb)?.addEventListener('click', async () => { try { const c = await api('/chats/open-private', { userId: id }); mb.close(); await loadChats(); openChat(c.id); } catch (er) { fail(er); } });
}
function editChatModal(c) {
  const mb = modal(`<div class="mh"><h2>Изменить</h2><button class="ico" id="cx">${I.close}</button></div><label class="field">Название<input id="et" maxlength="64" value="${esc(c.title)}"></label><label class="field">Описание<textarea id="ea" rows="3" maxlength="200">${esc(c.about || '')}</textarea></label><div class="err" id="ee"></div><button class="btn" id="es">Сохранить</button>`);
  $('#cx', mb).onclick = mb.close;
  $('#es', mb).onclick = async () => { try { await api('/chats/edit', { chatId: c.id, title: $('#et', mb).value, about: $('#ea', mb).value }); mb.close(); } catch (er) { $('#ee', mb).textContent = er.message; } };
}
function addMembersModal(c) {
  const mb = modal(`<div class="mh"><h2>Добавить участника</h2><button class="ico" id="cx">${I.close}</button></div><label class="field"><input id="as" placeholder="Имя, @username или номер" autocomplete="off"></label><div id="ar"></div>`);
  $('#cx', mb).onclick = mb.close; let tm;
  $('#as', mb).oninput = e => { clearTimeout(tm); tm = setTimeout(async () => { try { const r = (await api('/users/search?q=' + encodeURIComponent(e.target.value))).filter(u => !c.members.some(m => m.id === u.id)); cacheUsers(r); $('#ar', mb).innerHTML = r.map(u => `<div class="item" data-u="${esc(u.id)}">${userAv(u, 'sm')}<div class="mid"><div class="t">${esc(u.name)}</div><div class="pv">${u.username ? '@' + esc(u.username) : ''}</div></div></div>`).join(''); } catch { } }, 300); };
  $('#ar', mb).onclick = async e => { const it = e.target.closest('[data-u]'); if (!it) return; try { await api('/chats/members', { chatId: c.id, action: 'add', userId: it.dataset.u }); it.remove(); toast('Участник добавлен'); } catch (er) { fail(er); } };
  $('#as', mb).focus();
}

/* ---------- Realtime (SSE) ---------- */
function connect() {
  if (S.es) S.es.close();
  const es = new EventSource('/api/events?token=' + encodeURIComponent(S.token)); S.es = es;
  es.onopen = () => { if (S.chats.length) { loadChats(); const id = S.active; if (id) api('/messages?chat=' + encodeURIComponent(id)).then(r => { S.msgs[id] = r.messages; S.more[id] = r.hasMore; if (S.active === id) renderMsgs(false); }).catch(() => { }); } };
  const on = (n, fn) => es.addEventListener(n, e => { try { fn(JSON.parse(e.data)); } catch (er) { console.error(er); } });
  on('message', m => {
    const c = chat(m.chatId); if (!c) return loadChats();
    if (m.from !== S.me.id && S.me.username && new RegExp('(^|[^\\w])@' + S.me.username + '(?![\\w])', 'i').test(m.text || '')) c.mentions = (c.mentions || 0) + 1;
    const list = S.msgs[m.chatId]; if (list && !list.some(x => x.id === m.id)) { list.push(m); S.fresh.add(m.id); }
    const last = { ...m }; if (m.attach) last.attach = { name: m.attach.name, type: m.attach.type }; c.last = last; c.lastTs = m.ts;
    delete S.typing[m.chatId + ':' + m.from];
    if (S.active === m.chatId) {
      const ms = $('#ms'); const near = ms && ms.scrollHeight - ms.scrollTop - ms.clientHeight < 200;
      renderMsgs(m.from === S.me.id); renderStatus();
      if (m.from !== S.me.id) { c.unread = (c.unread || 0) + 1; if (near && !document.hidden) { markRead(); beep(1040); } else { S.away++; ms.onscroll(); notify(c, m); } }
    } else if (m.from !== S.me.id) { c.unread = (c.unread || 0) + 1; notify(c, m); }
    renderList(); updateTitle();
  });
  on('poll', ev => { const m = (S.msgs[ev.chatId] || []).find(x => x.id === ev.id); if (m) { m.poll = ev.poll; if (S.active === ev.chatId) renderMsgs(false); } });
  on('message_edit', ev => { const m = (S.msgs[ev.chatId] || []).find(x => x.id === ev.id); if (m) { m.text = ev.text; m.edited = true; } const c = chat(ev.chatId); if (c && c.last && c.last.id === ev.id) c.last.text = ev.text; if (S.active === ev.chatId) renderMsgs(false); renderList(); });
  on('message_delete', ev => { const l = S.msgs[ev.chatId]; if (l) S.msgs[ev.chatId] = l.filter(x => x.id !== ev.id); const c = chat(ev.chatId); if (c && c.last && c.last.id === ev.id) { const nl = S.msgs[ev.chatId]; if (nl && nl.length) c.last = nl[nl.length - 1]; else loadChats(); } if (S.active === ev.chatId) { renderMsgs(false); renderPin(); } renderList(); });
  on('reaction', ev => { const m = (S.msgs[ev.chatId] || []).find(x => x.id === ev.id); if (m) { m.reactions = ev.reactions; if (S.active === ev.chatId) renderMsgs(false); } });
  on('pin', ev => { const c = chat(ev.chatId); if (c) { c.pinned = ev.pinned; if (S.active === ev.chatId) { renderPin(); renderMsgs(false); } } });
  on('read', ev => { (S.msgs[ev.chatId] || []).forEach(m => { if (m.from === S.me.id && !m.readBy.includes(ev.userId)) m.readBy.push(ev.userId); }); if (S.active === ev.chatId) renderMsgs(false); });
  on('typing', ev => { const k = ev.chatId + ':' + ev.userId; clearTimeout(S.typing[k]); S.typing[k] = setTimeout(() => { delete S.typing[k]; renderStatus(); renderList(); }, 4000); renderStatus(); renderList(); });
  on('presence', ev => { const u = S.users[ev.userId]; if (u) { u.online = ev.online; u.lastSeen = ev.lastSeen; } S.chats.forEach(c => { if (c.peer && c.peer.id === ev.userId) { c.peer.online = ev.online; c.peer.lastSeen = ev.lastSeen; } c.members.forEach(m => { if (m.id === ev.userId) { m.online = ev.online; m.lastSeen = ev.lastSeen; } }); }); renderStatus(); renderList(); });
  on('user', u => { cacheUsers([u]); if (u.id === S.me.id) S.me = { ...S.me, ...u }; loadChats(); });
  on('chat', ev => { if (ev && ev.cleared) { S.msgs[ev.cleared] = []; if (S.active === ev.cleared) renderMsgs(false); } loadChats(); });
}

/* ---------- Новый чат ---------- */
function openNewChat(t0 = 'private') {
  let tab = t0; const picked = new Map(); let res = [];
  const mb = modal(''); const m = $('.modal', mb);
  const row = u => `<div class="item" data-u="${esc(u.id)}">${userAv(u, 'sm')}<div class="mid"><div class="t">${esc(u.name)}${badges(u)}</div><div class="pv">${u.username ? '@' + esc(u.username) : ''}</div></div></div>`;
  const draw = () => {
    if (tab === 'join') {
      m.innerHTML = `<div class="mh"><h2>Новый чат</h2><button class="ico" id="cx">${I.close}</button></div><div class="tabs">${[['private', 'Личный'], ['group', 'Группа'], ['channel', 'Канал'], ['join', 'По ссылке']].map(([k, v]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div><label class="field">Ссылка-приглашение<input id="jl" placeholder="limegram://join/…" autocomplete="off"></label><button class="btn" id="jb">Вступить</button>`;
      $('#cx', m).onclick = mb.close; m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; res = []; draw(); });
      const go = () => { const v = $('#jl', m).value.trim(); if (v) joinByLink(v, mb); };
      $('#jb', m).onclick = go; $('#jl', m).onkeydown = e => { if (e.key === 'Enter') go(); }; $('#jl', m).focus(); return;
    }
    m.innerHTML = `<div class="mh"><h2>Новый чат</h2><button class="ico" id="cx">${I.close}</button></div>
      <div class="tabs">${[['private', 'Личный'], ['group', 'Группа'], ['channel', 'Канал'], ['join', 'По ссылке']].map(([k, v]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      ${tab !== 'private' ? '<label class="field">Название<input id="nt" maxlength="64"></label>' : ''}
      <label class="field">${tab === 'private' ? 'Найти человека' : 'Добавить участников'}<input id="ns" placeholder="Имя, @username или номер телефона" autocomplete="off"></label>
      ${tab !== 'private' && picked.size ? `<div class="chips">${[...picked.values()].map(u => `<span class="chip" data-rm="${esc(u.id)}">${esc(u.name)} ✕</span>`).join('')}</div>` : ''}
      <div id="nr">${res.map(row).join('')}</div>${tab !== 'private' ? `<div class="err" id="ne"></div><button class="btn" id="nc">Создать ${tab === 'group' ? 'группу' : 'канал'}</button>` : ''}`;
    $('#cx', m).onclick = mb.close;
    m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; res = []; draw(); });
    m.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { picked.delete(b.dataset.rm); const t = $('#nt', m)?.value; draw(); if (t) $('#nt', m).value = t; });
    let tm; const ns = $('#ns', m);
    ns.oninput = () => { clearTimeout(tm); tm = setTimeout(async () => { try { res = await api('/users/search?q=' + encodeURIComponent(ns.value)); cacheUsers(res); $('#nr', m).innerHTML = res.map(row).join(''); } catch { } }, 300); };
    $('#nr', m).onclick = async e => {
      const it = e.target.closest('[data-u]'); if (!it) return;
      if (tab === 'private') { try { const c = await api('/chats/open-private', { userId: it.dataset.u }); mb.close(); await loadChats(); openChat(c.id); } catch (er) { fail(er); } }
      else { picked.set(it.dataset.u, S.users[it.dataset.u]); const t = $('#nt', m).value; draw(); $('#nt', m).value = t; }
    };
    const nc = $('#nc', m);
    if (nc) nc.onclick = async () => { try { const c = await api('/chats/create', { type: tab, title: $('#nt', m).value, members: [...picked.keys()] }); mb.close(); await loadChats(); openChat(c.id); } catch (er) { $('#ne', m).textContent = er.message; } };
    ns.focus();
  };
  draw();
}

/* ---------- Настройки ---------- */
function openSettings(tab = 'look') {
  const st = () => S.settings; let color = S.me.color;
  const mb = modal(''); const m = $('.modal', mb);
  const tgl = (id, on) => `<span class="tgl ${on ? 'on' : ''}" data-tg="${id}"></span>`;
  const draw = () => {
    const me = S.me; let body = '';
    if (tab === 'profile') body = `<div style="display:flex;gap:14px;align-items:center">${userAv(me, 'lg').replace('<i class="on-dot"></i>', '')}<div><b>${esc(fmtPhone(me.phone))}</b><div style="color:var(--muted);font-size:13px">ID ${esc(me.id)}</div></div></div>
      <label class="field">Имя<input id="pn" maxlength="64" value="${esc(me.name)}"></label><label class="field">Имя пользователя<input id="pu" maxlength="32" placeholder="@username" value="${me.username ? '@' + esc(me.username) : ''}"></label>
      <label class="field">О себе<textarea id="pb" maxlength="${me.premium ? 500 : 200}" rows="2">${esc(me.bio)}</textarea></label><div class="sw" id="sw">${(me.premium ? COLORS.concat(PCOLORS) : COLORS).map(c => `<button data-c="${c}" style="background:${c}" class="${c === color ? 'on' : ''}"></button>`).join('')}</div>
      <div class="err" id="pe"></div><button class="btn" id="ps">Сохранить</button>`;
    else if (tab === 'look') body = `<div class="field" style="margin-top:4px">Тема</div><div class="seg" id="th">${[['auto', 'Авто'], ['light', 'День'], ['dark', 'Ночь']].map(([k, v]) => `<button data-v="${k}" class="${(st().theme || 'auto') === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      <div class="field">Цвет акцента</div><div class="sw" id="ac">${ACCENTS.map(c => `<button data-c="${c}" style="background:${c}" class="${(st().accent || '#3390ec') === c ? 'on' : ''}"></button>`).join('')}</div>
      <div class="field">Фон чата</div><div class="seg" id="bgs">${[['pat', 'Узор'], ['grad', 'Градиент'], ['flat', 'Однотонный']].map(([k, v]) => `<button data-v="${k}" class="${(st().bg || 'pat') === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      <div class="field">Размер текста: <b id="fsv">${st().fontSize || 15}</b> px</div><input type="range" id="fs" min="13" max="19" value="${st().fontSize || 15}" style="width:100%;accent-color:var(--primary)">`;
    else if (tab === 'privacy') body = privacyBody();
    else if (tab === 'notif') body = `<div class="row2"><div>Звуки<small>Сигнал при новом сообщении</small></div>${tgl('sounds', st().sounds !== '0')}</div><div class="row2"><div>Уведомления на рабочем столе<small>Когда окно свёрнуто</small></div>${tgl('notify', st().notify !== '0')}</div>
      <button class="btn small ghost" id="nt" style="margin-top:6px">Разрешить системные уведомления</button>`;
    else body = `<p style="margin:0;color:var(--muted);font-size:13px">${me.hasPassword ? 'Облачный пароль включён. Он запрашивается при входе после кода.' : 'Облачный пароль не задан. Установите его, чтобы защитить вход.'} Пустое поле «новый» отключает пароль.</p>
      ${me.hasPassword ? '<label class="field">Текущий пароль<input id="po" type="password" autocomplete="current-password"></label>' : ''}<label class="field">Новый пароль (мин. 6 символов)<input id="pw" type="password" autocomplete="new-password"></label>
      <div class="err" id="pwe"></div><button class="btn" id="pp">Сменить пароль</button><button class="btn danger" id="lo" style="margin-top:8px">Выйти из аккаунта</button>`;
    m.innerHTML = `<div class="mh"><h2>Настройки</h2><button class="ico" id="cx">${I.close}</button></div><div class="tabs">${[['look', 'Оформление'], ['profile', 'Профиль'], ['notif', 'Уведомления'], ['privacy', 'Приватность'], ['sec', 'Безопасность']].map(([k, v]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>${body}`;
    $('#cx', m).onclick = mb.close; $$('[data-t]', m).forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    $$('[data-tg]', m).forEach(b => b.onclick = () => { const k = b.dataset.tg, on = st()[k] !== '0'; saveSettings({ [k]: on ? '0' : '1' }); b.classList.toggle('on', !on); });
    bindPrivacy(m, draw);
    $('#nt', m)?.addEventListener('click', () => Notification.requestPermission().then(p => toast(p === 'granted' ? 'Уведомления разрешены' : 'Уведомления запрещены')));
    $$('#th [data-v]', m).forEach(b => b.onclick = () => { saveSettings({ theme: b.dataset.v }); draw(); });
    $$('#bgs [data-v]', m).forEach(b => b.onclick = () => { saveSettings({ bg: b.dataset.v }); draw(); renderMain(); });
    $$('#ac [data-c]', m).forEach(b => b.onclick = () => { saveSettings({ accent: b.dataset.c }); draw(); });
    $('#fs', m)?.addEventListener('input', e => { $('#fsv', m).textContent = e.target.value; saveSettings({ fontSize: e.target.value }); });
    $$('#sw [data-c]', m).forEach(b => b.onclick = () => { color = b.dataset.c; $$('#sw [data-c]', m).forEach(x => x.classList.toggle('on', x === b)); });
    $('#ps', m)?.addEventListener('click', async () => { try { S.me = { ...S.me, ...(await api('/me/update', { name: $('#pn', m).value, username: $('#pu', m).value, bio: $('#pb', m).value, color })) }; toast('Профиль сохранён'); loadChats(); } catch (er) { $('#pe', m).textContent = er.message; } });
    $('#pp', m)?.addEventListener('click', async () => { try { const r = await api('/me/password', { old: $('#po', m)?.value || '', new: $('#pw', m).value }); S.me.hasPassword = r.hasPassword; toast(r.hasPassword ? 'Облачный пароль обновлён' : 'Облачный пароль отключён'); draw(); } catch (er) { $('#pwe', m).textContent = er.message; } });
    $('#lo', m)?.addEventListener('click', async () => { try { await api('/auth/logout', {}); } catch { } mb.close(); localLogout(); });
  };
  draw();
}
