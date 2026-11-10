'use strict';
/* LimeGram Gifts — Telegram-inspired gifts UI.
   Полностью клиентская часть: каталог, отправка, карточка в чате,
   просмотр, коллекционные номера, конвертация и скрытие в профиле. */

const gStyle = g => `--c1:${esc(g.c1 || '#60a5fa')};--c2:${esc(g.c2 || '#1d4ed8')}`;
const GB_DONE = new Set();

const TG_GIFT_IDS = {
  heart: 5170145012310081615,
  bear: 5170233102089322756,
  box: 5170250947678437525,
  rose: 5168103777563050263,
  cake: 5170144170496491616,
  bouquet: 5170314324215857265,
  rocket: 5170564780938756245,
  champ: 6028601630662853006,
  cup: 5168043875654172773,
  ring: 5170690322832818290,
  gem: 5170521118301225164
};
const TG_GIFT_API = 'https://api.changes.tg';
const TG_GIFT_ANIMS = new Map();

function giftTelegramId(g) {
  const kind = String(g?.gift || g?.giftId || g?.id || '');
  return Number(g?.telegramGiftId || TG_GIFT_IDS[kind] || 0);
}
function giftArt(g, cls = '') {
  const tgId = giftTelegramId(g);
  const fallback = esc(g.emoji || '🎁');
  return `<div class="tg-gift-art tg-real-gift ${cls}" style="${gStyle(g)}" data-tg-gift="${tgId}" data-fallback-emoji="${fallback}" role="img" aria-label="${esc(g.name || 'Подарок')}">
    <div class="tg-gift-lottie"><span class="tg-gift-loading">${fallback}</span></div>
  </div>`;
}

// Telegram gifts are delivered as original TGS (gzip-compressed Lottie) animations.
// The API is public; animations are loaded once per gift and reused in shop, chat and profile.
async function fetchTelegramGiftTgs(id, slug) {
  // The API exposes decompressed Lottie JSON directly; this avoids relying on pako.
  // Keep both ID and slug routes because older catalog records may have either identifier.
  const keys = [String(id), slug].filter(Boolean);
  for (const key of keys) {
    try {
      const res = await fetch(`${TG_GIFT_API}/original/${encodeURIComponent(key)}.json`, {
        mode: 'cors', cache: 'force-cache'
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && Array.isArray(data.layers)) return data;
    } catch (_) {}
  }
  return null;
}
function giftFallback(el) {
  const holder = el?.querySelector('.tg-gift-lottie');
  if (!holder) return;
  // Never leave a blank card: restore the catalog artwork if remote files/CDN fail.
  let fallback = holder.querySelector('.tg-gift-loading');
  if (!fallback) {
    fallback = document.createElement('span');
    fallback.className = 'tg-gift-loading';
    fallback.textContent = el.dataset.fallbackEmoji || '🎁';
    holder.replaceChildren(fallback);
  }
  el.classList.remove('tg-gift-loaded');
  el.classList.add('tg-gift-fallback');
}
function mountTelegramGift(el) {
  if (!el || el.dataset.mounted === '1') return;
  const id = Number(el.dataset.tgGift || 0);
  if (!id) { giftFallback(el); return; }
  el.dataset.mounted = '1';
  const cached = TG_GIFT_ANIMS.get(id);
  const render = data => {
    const holder = el.querySelector('.tg-gift-lottie');
    if (!holder || !el.isConnected) return;
    if (!data || !window.lottie?.loadAnimation) {
      giftFallback(el);
      return;
    }
    try {
      holder.replaceChildren();
      window.lottie.loadAnimation({
        container: holder, renderer: 'svg', loop: true, autoplay: true,
        animationData: data,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true }
      });
      el.classList.remove('tg-gift-fallback');
      el.classList.add('tg-gift-loaded');
    } catch (_) {
      giftFallback(el);
    }
  };
  if (cached) { render(cached); return; }
  const slug = Object.keys(TG_GIFT_IDS).find(k => TG_GIFT_IDS[k] === id);
  fetchTelegramGiftTgs(id, slug).then(data => {
    if (data) TG_GIFT_ANIMS.set(id, data);
    render(data);
  }).catch(() => giftFallback(el));
}
function scanTelegramGifts(root = document) {
  root.querySelectorAll?.('.tg-real-gift[data-tg-gift]').forEach(mountTelegramGift);
}
const tgGiftObserver = new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) {
    if (node.nodeType !== 1) continue;
    if (node.matches?.('.tg-real-gift')) mountTelegramGift(node);
    scanTelegramGifts(node);
  }
});
function startTelegramGiftPlayers() {
  scanTelegramGifts();
  if (document.body && !tgGiftObserverStarted) {
    tgGiftObserver.observe(document.body, { childList: true, subtree: true });
    tgGiftObserverStarted = true;
  }
}
let tgGiftObserverStarted = false;
document.addEventListener('DOMContentLoaded', startTelegramGiftPlayers);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startTelegramGiftPlayers, { once: true });
} else {
  startTelegramGiftPlayers();
}

function giftMsgHtml(m) {
  const g = m.gift || {};
  const meIsTo = g.to === S.me.id;
  const fromUser = g.anon || !m.from || m.from === S.me.id ? null : S.users[m.from];
  const recipient = meIsTo ? 'вас' : (S.users[g.to]?.name || 'пользователя');
  const title = meIsTo ? 'Подарок для вас' : `Подарок для ${esc(recipient)}`;
  const priceLine = g.price ? `Вы отправили подарок стоимостью ${fmtN(g.price)} звёзд` : 'Подарок';
  // Не показываем полноэкранный burst поверх чата: в Telegram подарок остаётся компактной карточкой сообщения.
  return `<div class="tg-gift-wrap">
    <div class="tg-gift-sent-label">${priceLine}</div>
    <button class="gmsg tg-gift-message" data-gv="${esc(m.id)}" style="${gStyle(g)}">
      ${giftArt(g, 'chat-art')}
      <div class="gm-t">${title}</div>
      <div class="gm-s">${esc(g.name || 'Подарок')}</div>
      ${g.note ? `<div class="gm-note">${esc(g.note)}</div>` : ''}
      <div class="tg-gift-view">Посмотреть</div>
    </button>
  </div>`;
}
function openGiftView(d) {
  const from = d.anon || !d.from ? null : (d.from === S.me.id ? S.me : S.users[d.from]);
  const mb = modal('');
  const m = $('.modal', mb);
  m.classList.add('gview', 'tg-gift-modal');
  const draw = () => {
    const mineNow = (S.me.gifts || []).find(x => x.id === d.id);
    const converted = mineNow?.converted;
    m.innerHTML = `<div class="tg-gift-view-head"><button class="ico" id="cx">${I.close}</button><div><b>Подарок</b><small>${esc(d.name || 'Подарок')}</small></div></div>
      <div class="tg-gift-detail">
        ${giftArt(d, 'detail-art')}
        ${d.total ? `<div class="tg-collectible">№${fmtN(d.num)} из ${fmtN(d.total)}</div>` : ''}
        <h2>${esc(d.name || 'Подарок')}</h2>
        <p class="tg-gift-meta">${from ? `От ${esc(from.name)}` : 'Скрытый отправитель'}</p>
        ${d.note ? `<div class="tg-gift-note">${esc(d.note)}</div>` : ''}
        ${d.price ? `<div class="tg-gift-price">${starI(16)}<b>${fmtN(d.price)}</b><span>стоимость</span></div>` : ''}
      </div>
      ${mineNow && !converted ? `<div class="tg-gift-actions"><button class="btn" id="cv">Обменять на ${fmtN(Math.floor(mineNow.price * .8))} ★</button><button class="btn ghost" id="hd">${mineNow.hidden ? 'Показать в профиле' : 'Скрыть из профиля'}</button></div>` : converted ? `<div class="tg-converted">Подарок уже обменян на звёзды</div>` : ''}`;
    $('#cx', m).onclick = mb.close;
    $('#cv', m)?.addEventListener('click', async () => {
      try { const r = await api('/gifts/convert', { id: d.id }); await refreshMe(); toast('Обменяно на ' + r.back + ' звёзд'); draw(); }
      catch (er) { fail(er); }
    });
    $('#hd', m)?.addEventListener('click', async () => {
      try { await api('/gifts/hide', { id: d.id, hidden: !mineNow.hidden }); await refreshMe(); draw(); }
      catch (er) { fail(er); }
    });
  };
  draw();
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-gv]'); if (!b) return;
  const id = b.dataset.gv, list = S.msgs[S.active] || [], msg = list.find(x => x.id === id);
  if (!msg?.gift) return;
  e.preventDefault(); e.stopPropagation();
  openGiftView({ ...msg.gift, from: msg.from });
}, true);

const shopCard = g => `<button class="gcard shop tg-shop-card ${g.total ? 'lim' : ''}" data-g="${esc(g.id)}" aria-label="${esc(g.name)}" ${g.left === 0 ? 'disabled' : ''} style="${gStyle(g)}">
  ${g.total ? `<i class="rb">${g.left === 0 ? 'РАСПРОДАНО' : 'LIMIT'}</i>` : ''}
  ${giftArt(g, 'shop-art')}
  <span class="tg-shop-price">${starI(14)}${fmtN(g.price)}</span>
</button>`;

async function openGifts(user) {
  GIFT_CACHE = null;
  await catalog();
  await refreshMe();

  // If opened from a private chat, use that chat's peer automatically.
  // This removes the long recipient-selection step.
  if (!user && typeof S !== 'undefined' && S.active) {
    const c = typeof chat === 'function' ? chat(S.active) : null;
    if (c?.type === 'private' && c.peer) user = S.users[c.peer.id] || c.peer;
  }

  const mb = modal('', true), m = $('.modal', mb);
  m.classList.add('tg-gifts-shop', 'tg-gifts-reference');
  let to = user || null, tab = 'all', busy = false;

  const sendGift = async g => {
    if (busy) return;
    if (!to?.id) {
      // Only when there is no active private chat do we need to pick a recipient.
      return pickRecipient(g);
    }
    const balance = Number(S.me?.stars || 0);
    if (balance < Number(g.price || 0)) return toast('Недостаточно звёзд', true);

    busy = true;
    try {
      await api('/gifts/send', { userId: String(to.id), gift: String(g.id), text: '', anon: false });
      await refreshMe();
      mb.close();
      toast('Подарок отправлен');
      try {
        const c = await api('/chats/open-private', { userId: String(to.id) });
        await loadChats();
        if (c?.id) await openChat(c.id);
      } catch { await loadChats(); }
    } catch (er) {
      toast(er?.message || 'Не удалось отправить подарок', true);
    } finally { busy = false; }
  };

  const pickRecipient = async pendingGift => {
    const r = await (async () => {
      try {
        const list = await api('/contacts');
        cacheUsers(list || []);
        return (list || []).filter(u => u.id !== S.me.id && !u.banned).slice(0, 40);
      } catch { return []; }
    })();
    m.innerHTML = `<div class="tg-quick-recipient">
      <div class="tg-quick-head"><button class="tg-ref-back" id="qb">${I.back || '‹'}</button><b>Кому отправить</b></div>
      <input id="qi" class="tg-quick-input" placeholder="Поиск пользователя" autocomplete="off">
      <div class="tg-quick-list" id="ql">${r.map(u => `<button class="tg-quick-user" data-u="${esc(u.id)}">${userAv(u,'sm')}<span>${esc(u.name || 'Пользователь')}</span></button>`).join('') || '<div class="tg-quick-empty">Нет пользователей</div>'}</div>
    </div>`;
    $('#qb', m).onclick = draw;
    const renderUsers = list => {
      $('#ql', m).innerHTML = list.map(u => `<button class="tg-quick-user" data-u="${esc(u.id)}">${userAv(u,'sm')}<span>${esc(u.name || 'Пользователь')}</span></button>`).join('') || '<div class="tg-quick-empty">Нет пользователей</div>';
      $$('.tg-quick-user', m).forEach(b => b.onclick = async () => {
        to = S.users[b.dataset.u];
        if (pendingGift) await sendGift(pendingGift);
        else draw();
      });
    };
    $$('.tg-quick-user', m).forEach(b => b.onclick = async () => {
      to = S.users[b.dataset.u];
      if (pendingGift) await sendGift(pendingGift);
      else draw();
    });
    let timer;
    $('#qi', m).oninput = () => {
      clearTimeout(timer);
      const q = $('#qi', m).value.trim();
      timer = setTimeout(async () => {
        if (!q) return renderUsers(r);
        try {
          const x = await api('/users/search?q=' + encodeURIComponent(q));
          cacheUsers(x || []); renderUsers((x || []).filter(u => u.id !== S.me.id && !u.banned));
        } catch {}
      }, 150);
    };
    $('#qi', m).focus();
  };

  const draw = () => {
    const list = GIFT_CACHE.gifts.filter(g => tab === 'all' || (tab === 'collectible' ? g.total > 0 : g.total === 0));
    m.innerHTML = `<div class="tg-ref-page">
      <div class="tg-ref-hero">
        <button class="tg-ref-close" id="cx">${I.close}</button>
        <div class="tg-ref-avatar">${userAv(S.me, 'lg')}</div>
        <div class="tg-ref-stars s1">★</div><div class="tg-ref-stars s2">★</div><div class="tg-ref-stars s3">★</div><div class="tg-ref-stars s4">★</div>
        <h2>Купить подарок</h2>
        <p>Подарок можно добавить в профиль или<br>отложить.</p>
      </div>
      <div class="tg-ref-tabs" id="gt2">
        <button data-t="all" class="${tab === 'all' ? 'on' : ''}">Все</button>
        <button data-t="collectible" class="${tab === 'collectible' ? 'on' : ''}">Коллекционные</button>
      </div>
      <div class="tg-ref-grid">${list.map(shopCard).join('')}</div>
      <div class="tg-ref-footer"><button id="backRef">Назад</button></div>
    </div>`;
    $('#cx', m).onclick = mb.close;
    $('#backRef', m).onclick = mb.close;
    $$('#gt2 [data-t]', m).forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    $$('.tg-shop-card', m).forEach(b => b.onclick = () => {
      const g = GIFT_CACHE.gifts.find(x => x.id === b.dataset.g);
      if (g && g.left !== 0) sendGift(g);
    });
  };

  draw();
}
