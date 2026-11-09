'use strict';
/* LimeGram — экраны в стиле Telegram: «Мои звёзды», Premium, профили, контекстное меню чата (перекрывают версии из app.js / premium.js) */
Object.assign(I, {
  chevron: _p('<path d="M9 5l7 7-7 7"/>'),
  hand: _p('<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10V5a1.5 1.5 0 0 1 3 0v5.5M14 10.5V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 6.5-6 6.5-2.5 0-4-1-5.5-3.5L3.5 13.5a1.5 1.5 0 0 1 2.4-1.7L8 14"/>'),
  plusc: _p('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  unread: _p('<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.3A7.5 7.5 0 0 1 12 4"/><circle cx="18" cy="6" r="2.4" fill="currentColor"/>'),
  broom: _p('<path d="M14 4l6 6M12.5 8.5l3 3M11 10.5l2.5 2.5c-1 3-3.5 6-8 7 .5-2 .8-4 1-6.5z"/>'),
  chart2: _p('<path d="M4 20h16M6 16l4-5 3 3 5-7"/>'),
});

const panel = () => { const mb = modal(''), m = $('.modal', mb); m.classList.add('tgs'); return [mb, m]; };
const sparkles = (n = 28) => Array.from({ length: n }, () => `<b class="sp" style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;font-size:${(8 + Math.random() * 10).toFixed(0)}px;animation-delay:${(Math.random() * 3).toFixed(2)}s">+</b>`).join('');
const SR = (id, ic, label, val, o = {}) => `<button class="sr${o.red ? ' red' : ''}" data-r="${id}">${ic ? `<i>${I[ic]}</i>` : ''}<span>${label}</span>${val != null ? `<em>${val}</em>` : ''}</button>`;

/* ---------- Меню с разделителями ---------- */
function ctxG(x, y, items) {
  closeCtx();
  const fns = [], list = items.filter(Boolean).filter((it, i, a) => !(it.sep && (i === 0 || i === a.length - 1 || a[i - 1].sep)));
  const m = document.createElement('div'); m.className = 'ctx';
  m.innerHTML = list.map(it => it.sep ? '<hr>' : (fns.push(it.fn), `<button data-i="${fns.length - 1}" class="${it.red ? 'red' : ''}">${I[it.icon] || ''}${esc(it.label)}</button>`)).join('');
  m.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { closeCtx(); fns[+b.dataset.i](); } });
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + 'px'; m.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + 'px';
  setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!m.contains(e.target)) closeCtx(); document.removeEventListener('mousedown', f); }));
  return m;
}

/* ---------- Удаление чата (у себя) ---------- */
const DELS = () => { try { return JSON.parse(localStorage.getItem('lg_deleted') || '{}'); } catch { return {}; } };
const _cmBase = chatMatches;
chatMatches = c => { const d = DELS()[c.id]; if (d !== undefined && (c.lastTs || 0) <= d) return false; return _cmBase(c); };
async function deleteChat(c) {
  if (c.type === 'group' || c.type === 'channel') return leaveChat(c);
  if (!(await confirmBox('Удалить чат «' + (c.peer ? c.peer.name : c.title) + '»? История будет очищена у вас, у собеседника сообщения останутся.', 'Удалить', true))) return;
  try {
    await api('/chats/clear', { chatId: c.id });
    const d = DELS(); d[c.id] = c.lastTs || 0; localStorage.setItem('lg_deleted', JSON.stringify(d));
    if (S.active === c.id) { S.active = null; S.info = false; renderMain(); }
    await loadChats(); renderList();
  } catch (er) { fail(er); }
}

/* ---------- ПКМ по чату ---------- */
function onListCtx(e) {
  const it = e.target.closest('[data-chat]'); if (!it) return; e.preventDefault();
  const c = chat(it.dataset.chat), p = prefs(c), set = patch => api('/chats/prefs', { chatId: c.id, ...patch }).catch(fail);
  const unr = c.unread || p.unreadMark;
  ctxG(e.clientX, e.clientY, [
    { icon: 'archive', label: p.archived ? 'Вернуть из архива' : 'Архивировать', fn: () => set({ archived: !p.archived }) },
    { icon: p.pinned ? 'unpin' : 'pin', label: p.pinned ? 'Открепить' : 'Закрепить', fn: () => set({ pinned: !p.pinned }) },
    { icon: p.muted ? 'bell' : 'mute', label: p.muted ? 'Включить уведомления' : 'Выключить уведомления', fn: () => set({ muted: !p.muted }) },
    unr ? { icon: 'check', label: 'Пометить как прочитанное', fn: () => api('/chats/read', { chatId: c.id }).then(() => { c.unread = 0; renderList(); updateTitle(); }).catch(fail) }
      : { icon: 'unread', label: 'Пометить как непрочитанное', fn: () => set({ unreadMark: true }) },
    { sep: 1 },
    c.type !== 'service' ? { icon: 'broom', label: 'Очистить историю', fn: () => clearHistory(c) } : null,
    c.type !== 'service' && c.type !== 'saved' ? { icon: 'trash2', label: c.type === 'private' ? 'Удалить чат' : c.type === 'group' ? 'Покинуть группу' : 'Покинуть канал', red: true, fn: () => deleteChat(c) } : null,
  ]);
}
$('#cl') && ($('#cl').oncontextmenu = onListCtx);

/* ---------- Мои звёзды ---------- */
async function openStars() {
  await catalog(); await refreshMe();
  const [mb, m] = panel(); let tab = 'all';
  const draw = () => {
    const me = S.me, wait = 86400000 - (Date.now() - (me.dailyAt || 0)), can = wait <= 0;
    const mine = (me.gifts || []).filter(g => !g.converted);
    const log = (me.starLog || []).filter(l => tab === 'all' || (tab === 'in' ? l.d >= 0 : l.d < 0)).slice(0, 60);
    m.innerHTML = `<div class="tb"><div class="hero stars">${sparkles()}<button class="ico hx" id="cx">${I.close}</button><div class="hs">${I.star}</div><h2>Звёзды LimeGram</h2><p>Звёзды нужны для покупки Premium и отправки подарков.</p></div>
    <div class="pad c"><button class="btn big" id="dl" ${can ? '' : 'disabled'}>${I.plusc}${can ? `Забрать бонус +${me.premium ? 30 : 10}` : `Бонус через ${Math.floor(wait / 3600000)} ч ${Math.floor(wait % 3600000 / 60000)} мин`}</button><div class="bal">Ваш баланс: ${starI(16)}<b>${fmtN(me.stars)}</b></div></div>
    <div class="grp">${SR('tr', 'gift', 'Подарить звёзды друзьям')}${SR('gf', 'gift', 'Отправить подарок')}${SR('pr', 'star', 'LimeGram Premium')}</div>
    ${mine.length ? `<div class="grp"><div class="sh">Мои подарки (${mine.length})</div><div class="gift-row" style="padding:6px 20px">${mine.map(g => { const c = giftOf(g.gift), f = S.users[g.from]; return `<div class="gcard own ${g.hidden ? 'dim' : ''}" style="--c1:${c.c1 || '#60a5fa'};--c2:${c.c2 || '#1d4ed8'}" title="${g.anon ? 'Анонимно' : f ? 'От ' + esc(f.name) : ''}">${g.total ? `<i class="gl">№${g.num} из ${fmtN(g.total)}</i>` : ''}<span class="ge">${c.emoji}</span><div class="gb"><button data-cv="${esc(g.id)}">→ ${Math.floor(g.price * 0.8)}★</button><button data-hd="${esc(g.id)}" data-v="${!g.hidden}">${g.hidden ? 'Показать' : 'Скрыть'}</button></div></div>`; }).join('')}</div></div>` : ''}
    <div class="grp"><div class="stabs" id="stb">${[['all', 'Все операции'], ['in', 'Зачисления'], ['out', 'Списания']].map(([k, v]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    ${log.map(l => `<div class="lg"><div class="lgi">${l.d >= 0 ? I.plusc : I.gift}</div><div class="lgt"><b>${esc(l.why)}</b><small>${fmtDT(l.ts)}</small></div><em class="${l.d >= 0 ? 'pl' : 'mi'}">${l.d >= 0 ? '+' : '−'}${fmtN(Math.abs(l.d))}${starI(15)}</em></div>`).join('') || '<div class="pad mu">Операций пока нет</div>'}</div></div>`;
    $('#cx', m).onclick = mb.close;
    $('#dl', m).onclick = async () => { try { const r = await api('/stars/daily', {}); await refreshMe(); toast('+' + r.amount + ' звёзд'); draw(); } catch (er) { fail(er); } };
    $$('[data-r]', m).forEach(b => b.onclick = () => { const k = b.dataset.r; mb.close(); if (k === 'tr') transferModal(); else if (k === 'gf') openGifts(); else openPremium(); });
    $$('#stb [data-t]', m).forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    $$('[data-cv]', m).forEach(b => b.onclick = async () => { try { const r = await api('/gifts/convert', { id: b.dataset.cv }); await refreshMe(); toast('Обменяно на ' + r.back + ' звёзд'); draw(); } catch (er) { fail(er); } });
    $$('[data-hd]', m).forEach(b => b.onclick = async () => { try { await api('/gifts/hide', { id: b.dataset.hd, hidden: b.dataset.v === 'true' }); await refreshMe(); draw(); } catch (er) { fail(er); } });
  };
  draw();
}

/* ---------- LimeGram Premium ---------- */
const PERK_UI = [['smile', '#f08c3a', 'Эмодзи-статус', 'Значок рядом с именем, который видят все.'], ['file', '#e5744a', 'Файлы до 5 МБ', 'Вместо 3 МБ в обычном аккаунте.'], ['edit', '#4aa3e5', 'О себе до 500 символов', 'Вместо 200: расскажите о себе подробнее.'],
['palette', '#d65d8f', 'Эксклюзивные цвета профиля', '8 дополнительных цветов для аватара.'], ['star', '#8e6bd1', 'Ежедневный бонус ×3', '30 звёзд в день вместо 10.'], ['verified', '#3390ec', 'Золотая звезда в профиле', 'Видна рядом с именем во всех чатах.']];
async function openPremium() {
  await catalog(); await refreshMe();
  const [mb, m] = panel(); const plans = GIFT_CACHE.plans; let sel = plans.length - 1;
  const base = plans[0].price / plans[0].months;
  const draw = () => {
    const me = S.me, pl = plans[sel], forever = me.premium && !me.premiumUntil;
    m.innerHTML = `<div class="tb"><div class="hero pm">${sparkles()}<button class="ico hx" id="cx">${I.close}</button><div class="hs">${I.star}</div><h2>LimeGram Premium</h2><p>${me.premium ? esc(premLeft(me)) : 'Больше свободы и эксклюзивные функции с подпиской LimeGram Premium.'}</p></div>
    ${forever ? '' : `<div class="grp0 plz">${plans.map((p, i) => [p, i]).reverse().map(([p, i]) => { const per = Math.round(p.price / p.months), off = Math.round(100 - per / base * 100); return `<button class="sr rd" data-p="${i}"><i class="rdo ${i === sel ? 'on' : ''}"></i><span><b>${p.months === 12 ? 'Ежегодно' : p.months === 1 ? 'Ежемесячно' : p.months + ' мес.'}</b>${off > 0 ? `<u>−${off}%</u>` : ''}<small>${fmtN(p.price)} ★ всего</small></span><em class="dim2">${fmtN(per)} ★ в месяц</em></button>`; }).join('')}</div>`}
    <div class="grp0" style="border-top:8px solid var(--bg2)">${PERK_UI.map(([ic, col, t, d]) => `<div class="pk"><i style="background:${col}">${I[ic]}</i><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>
    ${me.premium ? `<div class="grp"><div class="sh">Эмодзи-статус: ${esc(me.emoji || 'не выбран')}</div><div class="est-grid" style="padding:6px 20px 12px">${STATUS_EMOJI.map(e => `<button data-e="${e}" class="${me.emoji === e ? 'on' : ''}">${e}</button>`).join('')}<button data-e="" title="Убрать">✕</button></div></div>` : ''}</div>
    ${forever ? '' : `<div class="foot"><button class="btn pbtn" id="by">${me.premium ? 'Продлить' : 'Подключить'} за ${fmtN(pl.price)} ★</button><small>Ваш баланс: ${starI(13)}${fmtN(me.stars)}</small></div>`}`;
    $('#cx', m).onclick = mb.close;
    $$('[data-p]', m).forEach(b => b.onclick = () => { sel = +b.dataset.p; draw(); });
    $('#by', m)?.addEventListener('click', async () => {
      if (S.me.stars < pl.price) { mb.close(); toast('Не хватает звёзд: заберите бонус или получите звёзды', true); return openStars(); }
      try { await api('/premium/buy', { months: pl.months }); await refreshMe(); toast('LimeGram Premium активирован ⭐'); draw(); } catch (er) { fail(er); }
    });
    $$('.est-grid [data-e]', m).forEach(b => b.onclick = async () => { try { await api('/me/emoji-status', { emoji: b.dataset.e }); await refreshMe(); draw(); renderList(); } catch (er) { fail(er); } });
  };
  draw();
}

/* ---------- Профиль (свой и чужой) ---------- */
async function openUserInfo(id, ctxChat) {
  await catalog().catch(() => { });
  const self = id === S.me.id; let u = S.me;
  if (!self) { try { u = await api('/users/info?id=' + encodeURIComponent(id)); cacheUsers([u]); } catch (er) { return fail(er); } }
  const pc = S.chats.find(x => x.type === 'private' && x.peer && x.peer.id === id), isBl = !!(pc && pc.blocked), pf = pc ? prefs(pc) : {};
  const [mb, m] = panel();
  const gifts = (u.gifts || []).filter(g => !g.converted).slice(0, 30);
  const kv = (v, l, copy) => `<div class="kv2" ${copy ? `data-cp="${esc(copy)}"` : ''}><span>${v}</span><small>${l}</small></div>`;
  m.innerHTML = `<div class="tb"><div class="phero"><div class="pt">${self ? `<button class="ico" id="ped" title="Изменить">${I.edit}</button>` : ''}<button class="ico" id="cx">${I.close}</button></div>${userAv(u, 'lg')}<h2>${esc(u.name)}${badges(u)}</h2><small>${esc(self ? 'в сети' : fmtSeen(u))}</small></div>
  ${self ? '' : `<div class="acts"><button data-a="chat">${I.chat}<span>Чат</span></button><button data-a="mute">${pf.muted ? I.mute : I.bell}<span>${pf.muted ? 'Вкл. звук' : 'Звук'}</span></button><button data-a="gift">${I.gift}<span>Подарок</span></button></div>`}
  ${u.phone || u.bio || u.username ? '<div class="grp0 info">' : '<div>'}${u.phone ? kv(esc(fmtPhone(u.phone)), 'Телефон', fmtPhone(u.phone)) : ''}${u.bio ? kv(esc(u.bio), 'О себе') : ''}${u.username ? kv('@' + esc(u.username), 'Имя пользователя', '@' + u.username) : ''}</div>
  <div class="grp"><div class="sr" style="cursor:default"><i>${I.gift}</i><span>Подарки</span><em>${gifts.length}</em></div>${gifts.length ? `<div class="gift-grid shop prof">${gifts.map((g, k) => { const c = giftOf(g.gift); return `<button class="gcard shop own" data-pg="${k}" style="--c1:${c.c1 || '#60a5fa'};--c2:${c.c2 || '#1d4ed8'}" title="${esc(c.name)}">${g.total ? `<i class="gl">№${g.num} из ${fmtN(g.total)}</i>` : ''}<span class="ge">${c.emoji}</span></button>`; }).join('')}</div>` : '<p style="color:var(--muted);text-align:center;margin:6px 0 12px;font-size:13px">Подарков пока нет</p>'}</div>
  ${self ? '' : `<div class="grp">${SR('share', 'forward', 'Поделиться контактом')}${SR('block', 'hand', isBl ? 'Разблокировать' : 'Заблокировать', null, { red: !isBl })}</div>`}</div>`;
  $('#cx', m).onclick = mb.close;
  $('#ped', m)?.addEventListener('click', () => { mb.close(); openSettings('profile'); });
  $$('[data-pg]', m).forEach(b => b.onclick = () => { const g = gifts[+b.dataset.pg], c = giftOf(g.gift); openGiftView({ id: g.id, gift: g.gift, emoji: c.emoji, name: c.name, c1: c.c1, c2: c.c2, num: g.num, total: g.total, price: g.price, from: g.from, anon: !g.from || g.anon }); });
  $$('[data-cp]', m).forEach(b => b.onclick = () => navigator.clipboard?.writeText(b.dataset.cp).then(() => toast('Скопировано')));
  $$('[data-r]', m).forEach(b => b.onclick = () => { const k = b.dataset.r; mb.close(); if (k === 'share') { navigator.clipboard?.writeText([u.name, u.username ? '@' + u.username : '', u.phone ? fmtPhone(u.phone) : ''].filter(Boolean).join('\n')).then(() => toast('Контакт скопирован')); } else blockUser(id, !isBl); });
  const open = async () => { try { const c = await api('/chats/open-private', { userId: id }); mb.close(); await loadChats(); openChat(c.id); } catch (er) { fail(er); } };
  $$('[data-a]', m).forEach(b => b.onclick = async e => {
    const a = b.dataset.a;
    if (a === 'chat') open();
    else if (a === 'gift') { mb.close(); openGifts(u); }
    else if (a === 'call') toast('Звонки пока не поддерживаются');
    else if (a === 'mute') { if (!pc) return toast('Сначала откройте чат с пользователем'); try { await api('/chats/prefs', { chatId: pc.id, muted: !pf.muted }); mb.close(); toast(pf.muted ? 'Уведомления включены' : 'Уведомления выключены'); } catch (er) { fail(er); } }
    else { const r = b.getBoundingClientRect(); ctxG(r.left, r.bottom + 4, [{ icon: 'gift', label: 'Подарить подарок', fn: () => { mb.close(); openGifts(u); } }, pc ? { icon: 'broom', label: 'Очистить историю', fn: () => clearHistory(pc) } : null, { sep: 1 }, { icon: 'hand', label: isBl ? 'Разблокировать' : 'Заблокировать', red: !isBl, fn: () => { mb.close(); blockUser(id, !isBl); } }]); }
  });
}
