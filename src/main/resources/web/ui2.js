'use strict';
/* LimeGram — UI v2: аккаунты в меню, панель канала в стиле Telegram, «Управление каналом»,
   уведомления/звук/заголовок окна по новым настройкам. Загружается последним. */

/* ================= Аккаунты ================= */
const ACC_KEY = 'lg_accts';
const accts = () => { try { return JSON.parse(localStorage.getItem(ACC_KEY) || '[]'); } catch { return []; } };
const saveAccts = a => localStorage.setItem(ACC_KEY, JSON.stringify(a));
function rememberAcct(token, u) {
  if (!token || !u) return;
  const a = accts().filter(x => x.id !== u.id);
  a.push({ token, id: u.id, name: u.name, color: u.color });
  saveAccts(a);
}
let _ui2Back = null;
const _startApp2 = startApp;
startApp = function () {
  if (_ui2Back) { _ui2Back.remove(); _ui2Back = null; }
  if (S.token && S.me) rememberAcct(S.token, S.me);
  const r = _startApp2.apply(this, arguments);
  const ua = navigator.userAgent, br = /Edg\//.test(ua) ? 'Edge' : /Electron/.test(ua) ? 'LimeGram Desktop' : /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Браузер', os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  api('/me/session-label', { label: br + (os ? ', ' + os : '') }).catch(() => { });
  return r;
};
const _localLogout2 = localLogout;
localLogout = function () {
  saveAccts(accts().filter(x => x.token !== S.token));
  return _localLogout2.apply(this, arguments);
};
function switchAcct(a) { localStorage.setItem('lg_token', a.token); location.reload(); }
function addAcct() {
  if (S.es) { S.es.close(); S.es = null; }
  S.token = null; // токен текущего аккаунта остаётся в localStorage — «Вернуться» просто перезагружает страницу
  renderAuth();
  _ui2Back = document.createElement('button');
  _ui2Back.className = 'acc-back';
  _ui2Back.innerHTML = `${I.back}<span>Вернуться</span>`;
  _ui2Back.onclick = () => location.reload();
  document.body.appendChild(_ui2Back);
}

/* ================= Боковое меню ================= */
openDrawer = function () {
  if ($('.drawer')) return;
  const bg = document.createElement('div'); bg.className = 'drawer-bg';
  const d = document.createElement('div'); d.className = 'drawer';
  const items = [['user', 'Мой профиль', () => openUserInfo(S.me.id)], ['users', 'Создать группу', () => openNewChat('group')], ['channel', 'Создать канал', () => openNewChat('channel')], ['user', 'Контакты', openContacts], ['bookmark', 'Избранное', () => openChat('s_' + S.me.id)], ['star', 'LimeGram Premium', openPremium], ['star', 'Мои звёзды (' + (S.me.stars || 0) + ')', openStars], ['gift', 'Отправить подарок', () => openGifts()], ['settings', 'Настройки', () => openSettings('look')]];
  if (localStorage.getItem('lg_pass')) items.push(['lock', 'Заблокировать приложение', lockNow]);
  if (S.me.isAdmin) items.push(['shield', 'Админ-панель', openAdmin]);
  const dark = document.documentElement.dataset.theme === 'dark';
  const others = accts().filter(a => a.id !== S.me.id);
  d.innerHTML = `<div class="me"><button class="ico tg" id="dTg" style="color:#fff">${dark ? I.sun : I.moon}</button>${userAv(S.me, 'sm').replace('<i class="on-dot"></i>', '')}<div class="nm">${esc(S.me.name)}${badges(S.me)}</div><div class="ph">${esc(fmtPhone(S.me.phone))}</div></div>
    <div class="accs">${others.map((a, i) => `<button class="mi acc" data-a="${i}"><div class="av sm" style="background-color:${esc(a.color)}">${esc(initials(a.name))}</div><span>${esc(a.name)}</span></button>`).join('')}<button class="mi acc" id="dAdd"><div class="av sm add">${I.plus}</div><span>Добавить аккаунт</span></button></div>
    ${items.map((x, i) => `<button class="mi" data-i="${i}">${I[x[0]]}${x[1]}</button>`).join('')}<div class="sp"></div>
    <button class="mi" id="dOut">${I.logout}Выйти</button><div class="ver">LimeGram Desktop 3.0</div>`;
  const close = () => { d.classList.add('out'); bg.style.opacity = 0; setTimeout(() => { d.remove(); bg.remove(); }, 200); };
  bg.onclick = close;
  d.onclick = e => {
    const a = e.target.closest('.mi[data-a]'); if (a) { const x = others[+a.dataset.a]; close(); setTimeout(() => switchAcct(x), 120); return; }
    if (e.target.closest('#dAdd')) { close(); setTimeout(addAcct, 120); return; }
    const b = e.target.closest('.mi[data-i]'); if (b) { close(); setTimeout(items[+b.dataset.i][2], 120); }
  };
  $('#dTg', d).onclick = () => { saveSettings({ theme: dark ? 'light' : 'dark', tsty: '' }); close(); };
  $('#dOut', d).onclick = async () => { close(); try { await api('/auth/logout', {}); } catch { } localLogout(); };
  document.body.append(bg, d);
};

/* ================= Панель канала ================= */
const _infoPanel0 = infoPanel, _bindInfo0 = bindInfo;
const SUBS = ['подписчик', 'подписчика', 'подписчиков'], ADMS = ['администратор', 'администратора', 'администраторов'];
function refreshInfo(c) {
  const d = $('#ip'); if (!d) return;
  const cc = chat(c.id); if (!cc) return;
  d.innerHTML = infoPanel(cc); bindInfo(d, cc);
}
infoPanel = function (c) {
  if (c.type !== 'channel') return _infoPanel0(c);
  const adm = isChatAdmin(c), p = prefs(c), n = c.members.length, na = c.admins.length;
  return `<div class="mh" style="padding:10px 14px;margin:0"><h2>Информация</h2><button class="ico" id="ipx">${I.close}</button></div>
  <div class="ph">${avatarHtml(c, 'lg')}<h3>${esc(title(c))}</h3><small>${plN(n, SUBS)}</small></div>
  <div class="cacts"><button id="cSnd">${p.muted ? I.mute : I.bell}<span>Звук</span></button><button id="cDisc">${I.chat}<span>Обсуждение</span></button>${adm ? `<button id="cMng">${I.sliders}<span>Управление</span></button>` : ''}</div>
  ${c.about ? `<div class="kv"><small>Описание</small>${esc(c.about)}</div>` : ''}
  ${adm || c.username ? `<button class="crow lnk2" id="cLink">${I.link}<span>${c.username ? 'limegram://u/' + esc(c.username) : 'Ссылка-приглашение'}<small>${c.username ? 'Нажмите, чтобы скопировать' : 'Нажмите, чтобы открыть ссылку'}</small></span></button>` : ''}
  <div class="cgrp"><button class="crow" id="cSub">${I.users}<span>${plN(n, SUBS)}</span>${adm ? `<i class="rt" id="cAdd" title="Добавить подписчика">${I.plus}</i>` : ''}</button>
  <button class="crow" id="cAdm">${I.shield}<span>${plN(na, ADMS)}</span></button></div>
  <div class="cgrp"><button class="crow" id="cClr">${I.trash}<span>Очистить историю</span></button><button class="crow red" id="cLv">${I.logout}<span>Покинуть канал</span></button></div>`;
};
bindInfo = function (d, c) {
  if (c.type !== 'channel') return _bindInfo0(d, c);
  $('#ipx', d).onclick = () => { S.info = false; $('#ip')?.remove(); };
  $('#cSnd', d).onclick = async () => { const mute = !prefs(chat(c.id) || c).muted; try { await api('/chats/prefs', { chatId: c.id, muted: mute }); await loadChats(); refreshInfo(c); toast(mute ? 'Уведомления отключены' : 'Уведомления включены'); } catch (er) { fail(er); } };
  $('#cDisc', d).onclick = () => toast('У этого канала нет группы обсуждения');
  $('#cMng', d)?.addEventListener('click', () => manageChannel(c));
  $('#cLink', d)?.addEventListener('click', () => isChatAdmin(c) ? inviteModal(c) : copyText('limegram://u/' + c.username));
  $('#cSub', d).onclick = e => { if (e.target.closest('#cAdd')) addMembersModal(c); else subsModal(c); };
  $('#cAdm', d).onclick = () => adminsModal(c);
  $('#cClr', d).onclick = () => clearHistory(c);
  $('#cLv', d).onclick = () => leaveChat(c);
};

const roleOf = (c, id) => c.owner === id ? 'владелец' : c.admins.includes(id) ? 'админ' : '';

/* Подписчики */
function subsModal(c0) {
  const mb = modal(''), m = $('.modal', mb); m.classList.add('lsub');
  const draw = () => {
    const c = chat(c0.id) || c0;
    m.innerHTML = `<div class="th2"><button class="ico" id="lx">${I.back}</button><h2>Подписчики</h2></div><div class="lst">${c.members.map(mm => { const u = S.users[mm.id] || mm, r = roleOf(c, mm.id); return `<div class="item" data-mem="${esc(mm.id)}">${userAv(u, 'sm').replace('<i class="on-dot"></i>', '')}<div class="mid"><div class="t">${esc(u.name)}${badges(u)}</div><div class="pv ${u.online ? 'on' : ''}">${esc(fmtSeen(u))}</div></div>${r ? `<span class="role">${r}</span>` : ''}</div>`; }).join('')}</div>`;
    $('#lx', m).onclick = mb.close;
    $('.lst', m).onclick = e => { const it = e.target.closest('[data-mem]'); if (it) { mb.close(); openUserInfo(it.dataset.mem, c); } };
  };
  draw();
}

/* Администраторы */
function adminsModal(c0) {
  const mb = modal(''), m = $('.modal', mb); m.classList.add('lsub');
  let q = '';
  const draw = () => {
    const c = chat(c0.id) || c0, isOwner = c.owner === S.me.id;
    const list = c.admins.map(id => S.users[id] || c.members.find(x => x.id === id) || { id, name: 'Пользователь', color: '#888' }).filter(u => !q || (u.name || '').toLowerCase().includes(q));
    m.innerHTML = `<div class="th2"><h2>Администраторы</h2></div><div class="srch">${I.search}<input id="aq" placeholder="Поиск" autocomplete="off" value="${esc(q)}"></div>
      <div class="lst">${list.map(u => `<div class="item" data-adm="${esc(u.id)}">${userAv(u, 'sm').replace('<i class="on-dot"></i>', '')}<div class="mid"><div class="t">${esc(u.name)}${badges(u)}</div><div class="pv">${c.owner === u.id ? 'Владелец' : 'Администратор'}</div></div><span class="role">${c.owner === u.id ? 'владелец' : 'админ'}</span></div>`).join('') || '<div class="pad mu" style="padding:14px 20px">Никого не найдено</div>'}</div>
      <div class="foot">${isOwner ? '<button id="aAdd">Добавить администратора</button>' : '<span></span>'}<button id="aCl">Закрыть</button></div>`;
    $('#aCl', m).onclick = mb.close;
    const inp = $('#aq', m); inp.oninput = e => { q = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; draw(); const n = $('#aq', m); n.focus(); n.setSelectionRange(pos, pos); };
    $('#aAdd', m)?.addEventListener('click', () => addAdminModal(c0, draw));
    $('.lst', m).onclick = async e => {
      const it = e.target.closest('[data-adm]'); if (!it) return; const id = it.dataset.adm;
      if (id === c.owner) return openUserInfo(id, c);
      if (isOwner) { if (await confirmBox('Снять права администратора?', 'Снять', true)) { try { await api('/chats/members', { chatId: c.id, action: 'demote', userId: id }); await loadChats(); draw(); refreshInfo(c); } catch (er) { fail(er); } } }
      else openUserInfo(id, c);
    };
  };
  draw();
}
function addAdminModal(c0, after) {
  const mb = modal(''), m = $('.modal', mb); m.classList.add('lsub');
  const draw = () => {
    const c = chat(c0.id) || c0, cand = c.members.filter(x => !c.admins.includes(x.id));
    m.innerHTML = `<div class="th2"><button class="ico" id="lx">${I.back}</button><h2>Добавить администратора</h2></div><div class="lst">${cand.map(mm => { const u = S.users[mm.id] || mm; return `<div class="item" data-u="${esc(mm.id)}">${userAv(u, 'sm').replace('<i class="on-dot"></i>', '')}<div class="mid"><div class="t">${esc(u.name)}${badges(u)}</div><div class="pv">${esc(fmtSeen(u))}</div></div></div>`; }).join('') || '<div class="mu" style="padding:14px 20px">Все подписчики уже администраторы</div>'}</div>`;
    $('#lx', m).onclick = mb.close;
    $('.lst', m).onclick = async e => { const it = e.target.closest('[data-u]'); if (!it) return; try { await api('/chats/members', { chatId: c.id, action: 'promote', userId: it.dataset.u }); await loadChats(); toast('Администратор добавлен'); mb.close(); after && after(); refreshInfo(c); } catch (er) { fail(er); } };
  };
  draw();
}

/* Управление каналом (как «Редактировать канал» в Telegram) */
function manageChannel(c0) {
  const c = chat(c0.id) || c0;
  const mb = modal(''), m = $('.modal', mb); m.classList.add('tgs', 'mng');
  const soon = () => toast('Эта настройка появится в следующей версии');
  const R = (id, ic, label, val, o = {}) => `<button class="sr${o.red ? ' red' : ''}" data-g="${id}">${ic ? `<i>${I[ic]}</i>` : ''}<span>${label}${o.badge ? '<b class="nw">НОВОЕ</b>' : ''}</span>${val != null ? `<em>${val}</em>` : ''}</button>`;
  const TG = (id, ic, label) => `<button class="sr tr" data-g="${id}"><i>${I[ic]}</i><span>${label}</span><span class="tgl"></span></button>`;
  m.innerHTML = `<div class="th"><h2>Редактировать канал</h2></div>
  <div class="tb"><div class="pg">
    <div class="top">${avatarHtml(c, 'lg')}<label class="fl"><small>Название канала</small><input id="mgT" maxlength="64" value="${esc(c.title)}"></label></div>
    <textarea id="mgA" class="desc" rows="2" maxlength="200" placeholder="Описание (необязательно)">${esc(c.about || '')}</textarea>
    <div class="grp">${R('type', 'sliders', 'Тип канала', c.username ? 'Публичный' : 'Частный')}${R('soon', 'chat', 'Обсуждение', 'Нет')}${R('soon', 'chat', 'Сообщения каналу', 'Выкл.', { badge: 1 })}${R('soon', 'palette', 'Оформление', `<b class="chip">${esc(c.title)}</b>`)}${TG('soon', 'globe', 'Переводить сообщения')}${TG('soon', 'edit', 'Подписывать сообщения')}</div>
    <div class="hint">Добавлять имена администраторов к их сообщениям в канале.</div>
    <div class="grp0">${R('soon', 'smileplus', 'Реакции', 'Все')}${R('soon', 'smile', 'Приветственное сообщение', 'Выкл.')}${R('link', 'link', 'Пригласительные ссылки', 1)}${R('adm', 'shield', 'Администраторы', c.admins.length)}${R('sub', 'users', 'Подписчики', c.members.length)}${R('soon', 'ban', 'Чёрный список')}${R('soon', 'file', 'Недавние действия')}${R('soon', 'star', 'Партнёрские программы')}</div>
    <div class="grp">${R('soon', 'users', 'Добавить канал в сообщество')}<div class="hint" style="margin:0">Вы можете добавить канал в сообщество чатов, связанных между собой.</div></div>
    <div class="grp0"><button class="sr red ni" data-g="del"><span>Удалить канал</span></button></div>
  </div></div>
  <div class="mfoot"><button id="mgC">Отмена</button><button id="mgS">Сохранить</button></div>`;
  m.onclick = e => {
    const b = e.target.closest('[data-g]'); if (!b) return; const g = b.dataset.g;
    if (g === 'link') inviteModal(c); else if (g === 'type') typeModal(c, mb); else if (g === 'adm') adminsModal(c); else if (g === 'sub') subsModal(c);
    else if (g === 'del') delChat(c, mb); else soon();
  };
  $('#mgC', m).onclick = mb.close;
  $('#mgS', m).onclick = async () => {
    const t = $('#mgT', m).value.trim(); if (!t) return toast('Введите название канала', true);
    try { await api('/chats/edit', { chatId: c.id, title: t, about: $('#mgA', m).value }); await loadChats(); refreshInfo(c); mb.close(); toast('Канал сохранён'); } catch (er) { fail(er); }
  };
}

/* ================= Настройки: применение ================= */
const _apply2 = applySettings;
applySettings = function () {
  _apply2();
  const st = S.settings, root = document.documentElement, off = k => st[k] === '0';
  root.dataset.tsty = st.tsty || '';
  [['ps-msg', 'ch1'], ['ps-scroll', 'ch2'], ['ps-bg', 'ch3']].forEach(([cl, k]) => root.classList.toggle(cl, off(k)));
  if (st.sysAccent === '1') {
    try {
      const t = document.createElement('i'); t.style.color = 'AccentColor'; document.body.appendChild(t);
      const rgb = getComputedStyle(t).color.match(/\d+/g); t.remove();
      if (rgb) { const hex = '#' + rgb.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join(''); root.style.setProperty('--primary', hex); root.style.setProperty('--primary-d', shade(hex, .86)); }
    } catch { }
  }
  if (document.body) document.body.style.fontFamily = { sys: 'system-ui,sans-serif', serif: 'Georgia,"Times New Roman",serif', mono: 'ui-monospace,Consolas,monospace' }[st.font] || '';
  const mn = $('#main'), w = localStorage.getItem('lg_wall');
  if (mn) {
    if (st.wall === '1' && w) { mn.style.backgroundImage = `url("${w}")`; mn.style.backgroundSize = 'cover'; mn.style.backgroundPosition = 'center'; }
    else { mn.style.backgroundImage = ''; mn.style.backgroundSize = ''; mn.style.backgroundPosition = ''; }
  }
};
const _renderMain2 = renderMain;
renderMain = function () { const r = _renderMain2.apply(this, arguments); applySettings(); updateTitle(); return r; };

/* Заголовок окна: название чата / аккаунт / счётчик */
updateTitle = function () {
  const st = S.settings, n = S.chats.reduce((a, c) => a + (prefs(c).muted ? 0 : (c.unread || 0)), 0);
  const c = S.active ? chat(S.active) : null;
  let t = (st.winCnt !== '0' && n ? `(${n}) ` : '') + (st.winChat !== '0' && c ? title(c) + ' — ' : '') + 'LimeGram';
  if (st.winAcc !== '0' && S.me && accts().length > 1) t += ' · ' + S.me.name;
  document.title = t;
};

/* Звук и уведомления: громкость, имя/текст, типы чатов */
beep = function (freq = 880) {
  if (S.settings.sounds === '0') return;
  const v = (S.settings.volume === undefined ? 100 : +S.settings.volume) / 100; if (!v) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(Math.max(.0002, .12 * v), actx.currentTime + .01); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .22);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .24);
  } catch { }
};
notify = function (c, m) {
  const st = S.settings;
  if (prefs(c).muted) return;
  if (st[c.type === 'channel' ? 'nfChan' : c.type === 'group' ? 'nfGroup' : 'nfPriv'] === '0') return;
  beep(m.from === '0' ? 700 : 940);
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && st.notify !== '0') {
    try {
      const n = new Notification(st.notifName === '0' ? 'LimeGram' : title(c), { body: st.notifText === '0' ? 'Новое сообщение' : previewOf(m).slice(0, 120), silent: true });
      n.onclick = () => { window.focus(); openChat(c.id); };
    } catch { }
  }
};

applySettings();
