'use strict';
/* LimeGram: подарки как в Telegram.
   - меню «Купить подарок» (сетка карточек с ценой, вкладки, окно подтверждения)
   - анимированная карточка подарка в чате вместо обычного текста
   - окно «Посмотреть» (крупный подарок, номер, отправитель, обмен на звёзды)
   - эффект отправки/получения (взрыв звёзд) */

const gStyle = g => `--c1:${esc(g.c1 || '#60a5fa')};--c2:${esc(g.c2 || '#1d4ed8')}`;
const GB_DONE = new Set();

/* Эффект: подарок вылетает по центру, вокруг разлетаются звёзды */
function giftBurst(g) {
  const o = document.createElement('div');
  o.className = 'gburst';
  o.setAttribute('style', gStyle(g));
  const marks = ['⭐', '✨', '💫', '🌟'];
  let sp = '';
  for (let i = 0; i < 28; i++) {
    const a = Math.round(Math.random() * 360), d = 110 + Math.round(Math.random() * 190), dl = (Math.random() * 0.3).toFixed(2);
    sp += `<i style="--a:${a}deg;--d:${d}px;animation-delay:${dl}s">${marks[i % marks.length]}</i>`;
  }
  o.innerHTML = `<div class="gb-glow"></div><div class="gb-emoji">${esc(g.emoji)}</div>${sp}`;
  document.body.appendChild(o);
  setTimeout(() => o.remove(), 2700);
}

/* Карточка подарка внутри сообщения (как на скриншоте Telegram) */
function giftMsgHtml(m) {
  const g = m.gift, meIsTo = g.to === S.me.id, to = S.users[g.to];
  const title = meIsTo ? 'Подарок для вас' : 'Подарок для ' + esc(to?.name || 'пользователя');
  const sub = g.note ? esc(g.note) : (g.total ? `${esc(g.name)} · №${g.num} из ${fmtN(g.total)}` : esc(g.name));
  if (m.from !== S.me.id && S.fresh.has(m.id) && !GB_DONE.has(m.id)) { GB_DONE.add(m.id); setTimeout(() => giftBurst(g), 60); }
  return `<div class="gmsg" style="${gStyle(g)}">
    <div class="gm-stage"><i class="sp s1">✦</i><i class="sp s2">✦</i><i class="sp s3">✦</i><span class="ge">${esc(g.emoji)}</span></div>
    <div class="gm-t">${title}</div><div class="gm-s">${sub}</div>
    <button class="gm-b" data-gv="${esc(m.id)}">Посмотреть</button></div>`;
}

/* Окно просмотра подарка */
function openGiftView(d) {
  const from = d.anon || !d.from ? null : (d.from === S.me.id ? S.me : S.users[d.from]);
  const own = (S.me.gifts || []).find(x => x.id === d.id && !x.converted);
  const mb = modal('');
  const m = $('.modal', mb);
  m.classList.add('gview');
  const draw = () => {
    const mineNow = (S.me.gifts || []).find(x => x.id === d.id);
    m.innerHTML = `<div class="mh"><h2>${esc(d.name)}</h2><button class="ico" id="cx">${I.close}</button></div>
    <div class="gv-hero" style="${gStyle(d)}"><span class="ge">${esc(d.emoji)}</span>${d.total ? `<i class="gl">№${d.num} из ${fmtN(d.total)}</i>` : ''}</div>
    <div class="kv2"><span>${from ? esc(from.name) : 'Скрытый отправитель'}</span><small>Отправитель</small></div>
    ${d.price ? `<div class="kv2"><span>${starI(14)}${fmtN(d.price)}</span><small>Стоимость</small></div>` : ''}
    ${d.note ? `<div class="kv2"><span>${esc(d.note)}</span><small>Подпись</small></div>` : ''}
    ${mineNow && !mineNow.converted ? `<div class="grid2" style="margin-top:12px"><button class="btn ghost" id="cv">Обменять на ${fmtN(Math.floor(mineNow.price * 0.8))} ★</button><button class="btn ghost" id="hd">${mineNow.hidden ? 'Показать в профиле' : 'Скрыть из профиля'}</button></div>` : ''}`;
    $('#cx', m).onclick = mb.close;
    $('#cv', m)?.addEventListener('click', async () => { try { const r = await api('/gifts/convert', { id: d.id }); await refreshMe(); toast('Обменяно на ' + r.back + ' звёзд'); mb.close(); } catch (er) { fail(er); } });
    $('#hd', m)?.addEventListener('click', async () => { try { await api('/gifts/hide', { id: d.id, hidden: !mineNow.hidden }); await refreshMe(); draw(); } catch (er) { fail(er); } });
  };
  draw();
  setTimeout(() => giftBurst(d), 120);
}

/* Клик по «Посмотреть» в чате */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-gv]'); if (!b) return;
  const id = b.dataset.gv, list = S.msgs[S.active] || [], m = list.find(x => x.id === id);
  if (!m || !m.gift) return;
  e.stopPropagation();
  openGiftView({ ...m.gift, from: m.from });
}, true);

/* Меню подарков как в Telegram: «Купить подарок» */
const shopCard = g => `<button class="gcard shop ${g.total ? 'lim' : ''}" data-g="${esc(g.id)}" ${g.left === 0 ? 'disabled' : ''} style="${gStyle(g)}">${g.total ? `<i class="rb">${g.left === 0 ? 'Распродано' : 'Лимит'}</i>` : ''}<span class="ge">${esc(g.emoji)}</span><b class="gp">${starI(13)}${fmtN(g.price)}</b></button>`;

async function openGifts(user) {
  GIFT_CACHE = null; await catalog(); await refreshMe();
  const mb = modal('', true); const m = $('.modal', mb); m.classList.add('gshop');
  let sel = null, to = user || null, tab = 'all';
  const draw = () => {
    const g0 = sel && GIFT_CACHE.gifts.find(g => g.id === sel);
    if (g0) return drawConfirm(g0);
    const list = GIFT_CACHE.gifts.filter(g => tab === 'all' || g.total > 0);
    m.innerHTML = `<div class="gs-top"><button class="ico" id="cx">${I.close}</button>
      ${to ? `<div class="gs-who" id="who" title="Выбрать другого">${userAv(to, 'lg')}</div>` : '<div id="pk" style="margin:10px 0"></div>'}
      <h2>Купить подарок</h2>
      <p>Подарок можно добавить в профиль или отложить.<br>Редкий подарок можно обменять на звёзды.</p>
      <div class="gs-tabs" id="gt2">${[['all', 'Все'], ['lim', 'Коллекционные']].map(([k, v]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div></div>
      <div class="gift-grid shop">${list.map(shopCard).join('')}</div>
      <p class="gs-bal">Ваш баланс: ${starI(13)}<b>${fmtN(S.me.stars)}</b></p>`;
    $('#cx', m).onclick = mb.close;
    $('#who', m)?.addEventListener('click', () => { to = null; draw(); });
    if (!to) userPicker(mb, $('#pk', m), u => { to = u; draw(); });
    $$('#gt2 [data-t]', m).forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    $$('.gcard', m).forEach(b => b.onclick = () => { if (!to) { toast('Сначала выберите получателя', true); return; } sel = b.dataset.g; draw(); });
  };
  const drawConfirm = g0 => {
    m.innerHTML = `<div class="gs-top"><button class="ico" id="bk">${I.back || '←'}</button>
      <div class="gv-hero" style="${gStyle(g0)}"><span class="ge">${esc(g0.emoji)}</span>${g0.total ? `<i class="gl">Осталось ${fmtN(g0.left)} из ${fmtN(g0.total)}</i>` : ''}</div>
      <h2>Подарок для ${esc(to.name)}</h2><p>${esc(g0.name)}${g0.total ? ' · коллекционный' : ''}</p></div>
      <label class="field">Подпись (необязательно)<input id="gt" maxlength="200" placeholder="Добавьте сообщение"></label>
      <label class="row2" style="cursor:pointer"><div>Скрыть моё имя<small>Получатель не узнает, от кого подарок</small></div><input type="checkbox" id="ga"></label>
      <div class="err" id="er"></div>
      <button class="btn" id="ok">Отправить подарок за ${starI(14)}${fmtN(g0.price)}</button>
      <p class="gs-bal">Ваш баланс: ${starI(13)}<b>${fmtN(S.me.stars)}</b></p>`;
    $('#bk', m).onclick = () => { sel = null; draw(); };
    $('#ok', m).onclick = async () => {
      const btn = $('#ok', m); btn.disabled = true;
      try {
        await api('/gifts/send', { userId: to.id, gift: sel, text: $('#gt', m).value, anon: $('#ga', m).checked });
        await refreshMe(); mb.close(); giftBurst(g0);
        try { const c = await api('/chats/open-private', { userId: to.id }); await loadChats(); openChat(c.id); } catch { loadChats(); }
      } catch (er) { btn.disabled = false; $('#er', m).textContent = er.message; }
    };
  };
  draw();
}
