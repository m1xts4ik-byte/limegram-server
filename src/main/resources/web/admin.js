'use strict';
/* LimeGram — админ-панель: статистика, пользователи, номера +888, рассылка */
async function openAdmin(tab0 = 'stats') {
  let tab = tab0, users = [], numbers = [], stats = null, uf = '', nf = '';
  const mb = modal('<div class="mh"><h2>Админ-панель</h2><button class="ico" id="cx"></button></div><div id="adm"><div class="spin"></div></div>', true);
  $('#cx', mb).innerHTML = I.close; $('#cx', mb).onclick = mb.close;
  const body = () => $('#adm', mb);
  const tabsHtml = () => `<div class="tabs">${[['stats', 'Обзор'], ['users', 'Пользователи'], ['numbers', 'Номера +888'], ['prem', 'Premium и звёзды'], ['cast', 'Рассылка']].map(([k, v]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>`;
  const load = async () => {
    try {
      [stats, users, numbers] = await Promise.all([api('/admin/stats'), api('/admin/users'), api('/admin/numbers')]);
      draw();
    } catch (er) { body().textContent = er.message; }
  };
  const mini = (cls, attr, icon, label) => `<button class="mini-b ${cls || ''}" ${attr} title="${esc(label)}" style="display:inline-flex;gap:4px;align-items:center">${(I[icon] || '').replace('class="ic"', 'class="ic" style="width:14px;height:14px"')}${esc(label)}</button>`;
  const draw = () => {
    let h = tabsHtml();
    if (tab === 'stats') {
      h += `<div class="stats">${[['Пользователей', stats.users], ['Онлайн', stats.online], ['Заблокировано', stats.banned], ['Личных чатов', stats.privateChats], ['Групп', stats.groups], ['Каналов', stats.channels], ['Сообщений', stats.messages], ['Номеров +888 свободно', stats.numbersFree], ['Номеров +888 занято', stats.numbersUsed]].map(([a, b], i) => `<div class="stat" style="animation-delay:${i * 30}ms"><b>${b}</b><span>${a}</span></div>`).join('')}</div>
        <p style="color:var(--muted);font-size:13px;margin:12px 0 0">SMS-шлюз: ${esc(stats.smsGateway)}</p>`;
    } else if (tab === 'users') {
      h += `<label class="field">Поиск<input id="uf" value="${esc(uf)}" placeholder="Имя, username, номер"></label><div class="tw"><table><thead><tr><th>ID</th><th>Пользователь</th><th>Номер</th><th>Статус</th><th>★ Баланс</th><th>Premium</th><th>Действия</th></tr></thead><tbody>${users.filter(u => !uf || (u.name + ' ' + u.username + ' ' + u.phone).toLowerCase().includes(uf)).map(u => `<tr>
        <td>${esc(u.id)}</td><td>${esc(u.name)}${badges(u)}${u.username ? ' <span style="color:var(--muted)">@' + esc(u.username) + '</span>' : ''}${u.isAdmin ? ' ' + I.shield.replace('class="ic"', 'class="ic" style="display:inline;width:15px;height:15px;vertical-align:-3px;color:var(--primary)"') : ''}</td>
        <td class="num">${esc(fmtPhone(u.phone))}</td><td>${u.banned ? '<span style="color:var(--danger)">заблокирован</span>' : u.online ? '<span style="color:var(--ok)">в сети</span>' : 'офлайн'}</td>
        <td>${fmtN(u.stars)} ★</td><td>${u.premium ? (u.premiumUntil ? 'до ' + new Date(u.premiumUntil).toLocaleDateString('ru-RU') : 'навсегда') : '—'}</td>
        <td style="white-space:nowrap">${u.isAdmin ? '' : `<div style="display:flex;gap:4px;flex-wrap:wrap">${mini('', `data-flag="verified" data-id="${esc(u.id)}" data-v="${!u.verified}"`, 'verified', u.verified ? 'Снять ✓' : 'Галочка')}${mini('', `data-prem="${esc(u.id)}"`, 'star', 'Premium')}${mini('', `data-stars="${esc(u.id)}"`, 'star', 'Звёзды')}${mini('', `data-kick="${esc(u.id)}"`, 'logout', 'Сессии')}${u.hasPassword ? mini('', `data-rp="${esc(u.id)}"`, 'key', 'Пароль') : ''}${mini('d', `data-ban="${esc(u.id)}" data-v="${!u.banned}"`, 'ban', u.banned ? 'Разблок.' : 'Блок')}${mini('d', `data-del="${esc(u.id)}"`, 'trash2', 'Удалить')}</div>`}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (tab === 'numbers') {
      const list = numbers.filter(n => !nf || (n.pretty + ' ' + n.number + ' ' + (n.owner || '') + ' ' + (n.note || '')).toLowerCase().includes(nf));
      h += `<div class="anon" style="margin-bottom:10px">${I.info}<span>Анонимные номера <b>+888 XXXX XXX</b> существуют только внутри вашего LimeGram. Войти по такому номеру можно, только если он выдан здесь. Код для нового номера виден в этой таблице (колонка «Код»), для занятого — приходит в чат LimeGram владельца.</span></div>
        <div class="grid2"><label class="field">Номер или маска (необязательно)<input id="ni" placeholder="888 1234 567  или  888 77xx xxx"></label><label class="field">Количество (для случайных и масок)<input id="nc" type="number" min="1" max="500" value="10"></label></div>
        <label class="field">Заметка (кому / для чего)<input id="nn" maxlength="80"></label><div class="err" id="ne"></div>
        <button class="btn small" id="nissue" style="margin-bottom:14px">${(I.plus).replace('class="ic"', 'class="ic" style="display:inline;width:16px;height:16px;vertical-align:-3px"')} Выдать номера</button>
        <label class="field">Поиск по номерам<input id="nfi" value="${esc(nf)}" placeholder="Номер, владелец, заметка"></label>
        <div style="display:flex;gap:8px;margin-bottom:6px"><button class="mini-b" id="ncopy">Копировать свободные (${numbers.filter(n => !n.userId).length})</button><button class="mini-b" id="nref">Обновить коды</button></div>
        <div class="tw"><table><thead><tr><th>Номер</th><th>Статус</th><th>Код</th><th>Заметка</th><th>Действия</th></tr></thead><tbody>${list.map(n => `<tr><td class="num">${esc(n.pretty)}</td>
        <td>${n.userId ? `<span class="pill used">${esc(n.owner || 'занят')}</span>` : '<span class="pill free">свободен</span>'}</td>
        <td class="num">${n.pendingCode ? esc(n.pendingCode) : '<span style="color:var(--muted)">—</span>'}</td><td>${esc(n.note || '')}</td>
        <td style="white-space:nowrap"><div style="display:flex;gap:4px">${mini('', `data-ncp="${esc(n.pretty)}"`, 'copy', 'Копировать')}${n.userId ? '' : mini('', `data-nas="${esc(n.number)}"`, 'user', 'Выдать юзеру') + mini('d', `data-nrv="${esc(n.number)}"`, 'trash2', 'Отозвать')}</div></td></tr>`).join('') || '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:20px">Номеров пока нет — выдайте первые выше</td></tr>'}</tbody></table></div>`;
    } else if (tab === 'prem') {
      const pu = users.filter(u => u.premium).length, tot = users.reduce((a, u) => a + (u.stars || 0), 0);
      h += `<div class="stats">${[['Premium-пользователей', pu], ['Звёзд у всех', fmtN(tot)]].map(([a, b]) => `<div class="stat"><b>${b}</b><span>${a}</span></div>`).join('')}</div>
        <div class="anon" style="margin:12px 0">${I.info}<span>Массовая выдача: всем незаблокированным пользователям. Premium продлевается на указанное число дней. Индивидуально — кнопки «Premium» и «Звёзды» в списке пользователей.</span></div>
        <div class="grid2"><label class="field">Звёзд каждому<input id="gas" type="number" min="0" value="0"></label><label class="field">Premium (дней, 0 — не выдавать)<input id="gad" type="number" min="0" value="0"></label></div><button class="btn small" id="gall">Выдать всем</button>`;
    } else {
      h += `<label class="field">Сообщение всем пользователям (придёт в чат LimeGram)<textarea id="bc" rows="4" maxlength="2000"></textarea></label><button class="btn small" id="bcs">${I.broadcast.replace('class="ic"', 'class="ic" style="display:inline;width:16px;height:16px;vertical-align:-3px"')} Отправить всем</button>`;
    }
    body().innerHTML = h;
  };
  mb.addEventListener('click', async e => {
    const t = e.target, q = s => t.closest(s);
    try {
      if (q('[data-tab]')) { tab = q('[data-tab]').dataset.tab; return draw(); }
      if (q('[data-flag]')) { const b = q('[data-flag]'); await api('/admin/flag', { userId: b.dataset.id, flag: b.dataset.flag, value: b.dataset.v === 'true' }); return load(); }
      if (q('[data-prem]')) return adminPremiumModal(users.find(x => x.id === q('[data-prem]').dataset.prem), load);
      if (q('[data-stars]')) return adminStarsModal(users.find(x => x.id === q('[data-stars]').dataset.stars), load);
      if (q('#gall')) { const st = +$('#gas', mb).value || 0, dy = +$('#gad', mb).value || 0; if (!st && !dy) return toast('Укажите звёзды или дни', true); if (await confirmBox(`Выдать всем: ${st} ★ и ${dy} дн. Premium?`, 'Выдать')) { const r = await api('/admin/grant-all', { stars: st, days: dy }); toast('Выдано пользователям: ' + r.count); load(); } return; }
      if (q('[data-kick]')) { await api('/admin/kick', { userId: q('[data-kick]').dataset.kick }); return toast('Сессии пользователя завершены'); }
      if (q('[data-rp]')) { if (await confirmBox('Сбросить облачный пароль пользователя?', 'Сбросить', true)) { await api('/admin/reset-password', { userId: q('[data-rp]').dataset.rp }); toast('Пароль сброшен'); load(); } return; }
      if (q('[data-ban]')) { const b = q('[data-ban]'); await api('/admin/ban', { userId: b.dataset.ban, banned: b.dataset.v === 'true' }); return load(); }
      if (q('[data-del]')) { if (await confirmBox('Удалить пользователя и все его сообщения? Это необратимо.', 'Удалить', true)) { await api('/admin/delete-user', { userId: q('[data-del]').dataset.del }); load(); } return; }
      if (q('#nissue')) {
        const r = await api('/admin/numbers/issue', { number: $('#ni', mb).value, count: +$('#nc', mb).value || 1, note: $('#nn', mb).value });
        toast('Выдано номеров: ' + r.issued.length); await load(); return;
      }
      if (q('[data-ncp]')) return copyText(q('[data-ncp]').dataset.ncp);
      if (q('#ncopy')) return copyText(numbers.filter(n => !n.userId).map(n => n.pretty).join('\n'));
      if (q('#nref')) return load();
      if (q('[data-nrv]')) { if (await confirmBox('Отозвать этот номер?', 'Отозвать', true)) { await api('/admin/numbers/revoke', { number: q('[data-nrv]').dataset.nrv }); load(); } return; }
      if (q('[data-nas]')) return assignNumber(q('[data-nas]').dataset.nas, load);
      if (q('#bcs')) { const tx = $('#bc', mb).value; if (!tx.trim()) return; if (await confirmBox('Отправить сообщение всем пользователям?', 'Отправить')) { const r = await api('/admin/broadcast', { text: tx }); toast('Отправлено: ' + r.sent); $('#bc', mb).value = ''; } }
    } catch (er) { if ($('#ne', mb) && q('#nissue')) $('#ne', mb).textContent = er.message; else fail(er); }
  });
  mb.addEventListener('input', e => {
    if (e.target.id === 'uf') { uf = e.target.value.toLowerCase(); const p = e.target.selectionStart; draw(); const i = $('#uf', mb); i.focus(); i.setSelectionRange(p, p); }
    if (e.target.id === 'nfi') { nf = e.target.value.toLowerCase(); const p = e.target.selectionStart; draw(); const i = $('#nfi', mb); i.focus(); i.setSelectionRange(p, p); }
  });
  load();
}
function adminPremiumModal(u, done) {
  const mb = modal(`<div class="mh"><h2>Premium: ${esc(u.name)}</h2><button class="ico" id="cx">${I.close}</button></div>
    <p style="margin:0;color:var(--muted);font-size:13px">Сейчас: ${u.premium ? (u.premiumUntil ? 'до ' + new Date(u.premiumUntil).toLocaleString('ru-RU') : 'навсегда') : 'нет'}</p>
    <div class="grid2" style="margin-top:10px">${[['7', '+7 дней'], ['30', '+30 дней'], ['90', '+90 дней'], ['365', '+1 год'], ['0', 'Навсегда'], ['-1', 'Отозвать']].map(([d, l]) => `<button class="btn ${d === '-1' ? 'danger' : 'ghost'}" data-d="${d}">${l}</button>`).join('')}</div>
    <label class="field">Своё число дней<input id="cd" type="number" min="1" placeholder="например 14"></label><button class="btn" id="ok">Выдать</button>`);
  $('#cx', mb).onclick = mb.close;
  const go = async d => { try { await api('/admin/premium', { userId: u.id, days: d }); mb.close(); toast(d < 0 ? 'Premium отозван' : 'Premium выдан'); done(); } catch (er) { fail(er); } };
  mb.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) go(+b.dataset.d); });
  $('#ok', mb).onclick = () => { const d = +$('#cd', mb).value; if (d > 0) go(d); };
}
function adminStarsModal(u, done) {
  const mb = modal(`<div class="mh"><h2>Звёзды: ${esc(u.name)}</h2><button class="ico" id="cx">${I.close}</button></div>
    <p style="margin:0;color:var(--muted);font-size:13px">Баланс: <b>${fmtN(u.stars)}</b> ★</p>
    <div class="grid2" style="margin-top:10px">${[100, 500, 1000, 5000, 10000, 100000].map(n => `<button class="btn ghost" data-a="${n}">+${fmtN(n)}</button>`).join('')}</div>
    <label class="field">Своё число (минус — списать)<input id="am" type="number" placeholder="например 250"></label>
    <div class="grid2"><button class="btn" id="add">Начислить / списать</button><button class="btn ghost" id="set">Установить баланс</button></div>`);
  $('#cx', mb).onclick = mb.close;
  const go = async (amount, set) => { try { await api('/admin/stars', { userId: u.id, amount, set }); mb.close(); toast('Готово'); done(); } catch (er) { fail(er); } };
  mb.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) go(+b.dataset.a, false); });
  $('#add', mb).onclick = () => { const v = $('#am', mb).value; if (v !== '') go(+v, false); };
  $('#set', mb).onclick = () => { const v = $('#am', mb).value; if (v !== '') go(+v, true); };
}
function assignNumber(number, done) {
  const mb = modal(`<div class="mh"><h2>Выдать ${esc(fmtPhone(number))}</h2><button class="ico" id="cx">${I.close}</button></div>
    <p style="margin:0;color:var(--muted);font-size:13px">Номер станет номером входа выбранного пользователя. Его текущие сессии будут завершены, код входа придёт в чат LimeGram.</p>
    <label class="field">Найти пользователя<input id="as" placeholder="Имя или @username" autocomplete="off"></label><div id="ar"></div>`);
  $('#cx', mb).onclick = mb.close; let tm;
  $('#as', mb).oninput = e => { clearTimeout(tm); tm = setTimeout(async () => { try { const r = await api('/users/search?q=' + encodeURIComponent(e.target.value)); cacheUsers(r); $('#ar', mb).innerHTML = r.map(u => `<div class="item" data-u="${esc(u.id)}">${userAv(u, 'sm')}<div class="mid"><div class="t">${esc(u.name)}</div><div class="pv">${u.username ? '@' + esc(u.username) : 'ID ' + esc(u.id)}</div></div></div>`).join(''); } catch { } }, 300); };
  $('#ar', mb).onclick = async e => { const it = e.target.closest('[data-u]'); if (!it) return; try { await api('/admin/numbers/assign', { number, userId: it.dataset.u }); mb.close(); toast('Номер выдан'); done(); } catch (er) { fail(er); } };
  $('#as', mb).focus();
}
boot();
