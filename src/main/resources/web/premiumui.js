/* LimeGram — выбор личного канала и Premium-эмодзи в стиле Telegram */
const PCH_EMOJI = {
  'Популярные': '🔥 огонь|💎 алмаз|🚀 ракета|👑 корона|🌈 радуга|🍋 лайм лимон|❤️ сердце|😎 очки|⭐ звезда|✨ блеск|💫 искры|🏆 кубок|🎯 цель|⚡ молния|🦄 единорог|🍀 клевер|🌙 луна|☀️ солнце|🎉 праздник|💯 сто',
  'Лица': '😀 улыбка|😂 смех|🥹 слёзы|😍 влюблён|🤩 вау|😎 крутой|🥳 праздник|😴 сон|🤔 думаю|😇 ангел|😈 чёрт|🤖 робот|👻 призрак|💀 череп|🤡 клоун|😡 злой|🥶 холод|🥵 жара|🤯 взрыв мозга|😭 плач',
  'Животные': '🦄 единорог|🐱 кот|🐶 собака|🦊 лиса|🐼 панда|🐸 лягушка|🐧 пингвин|🦁 лев|🐯 тигр|🐙 осьминог|🦋 бабочка|🐝 пчела|🐢 черепаха|🦉 сова|🐺 волк|🐲 дракон|🦈 акула|🐬 дельфин|🐰 заяц|🐨 коала',
  'Еда': '🍋 лимон|🍎 яблоко|🍓 клубника|🍑 персик|🍕 пицца|🍔 бургер|🍟 фри|🍩 пончик|🍪 печенье|🍫 шоколад|🍿 попкорн|☕ кофе|🍺 пиво|🍷 вино|🍉 арбуз|🥑 авокадо|🌶️ перец|🍰 торт|🍦 мороженое|🥐 круассан',
  'Активности': '🎮 игры|🎧 музыка|🎸 гитара|🎬 кино|🎨 искусство|⚽ футбол|🏀 баскетбол|🏆 победа|🎲 кубик|🎯 дартс|🏄 сёрф|🚴 велосипед|🧩 пазл|🎤 микрофон|📸 фото|🎹 пианино|♟️ шахматы|🥇 золото|🏋️ спорт|🎳 боулинг',
  'Объекты': '💻 ноутбук|📱 телефон|💡 идея|🔑 ключ|🔒 замок|📚 книги|✏️ карандаш|💰 деньги|🎁 подарок|🔔 звонок|🧲 магнит|🔮 шар|🛡️ щит|⚔️ мечи|🧪 колба|🔭 телескоп|🪄 палочка|💣 бомба|🕯️ свеча|🧿 амулет',
  'Символы': '❤️ красное|🧡 оранжевое|💛 жёлтое|💚 зелёное|💙 синее|💜 фиолетовое|🖤 чёрное|🤍 белое|💔 разбитое|💖 блестящее|♾️ бесконечность|✅ галочка|❗ внимание|🔞 18|☮️ мир|☯️ инь-ян|🌀 вихрь|🔱 трезубец|⚜️ лилия|💠 ромб'
};

function openEmojiStatusPicker(done) {
  const mb = modal(''), m = $('.modal', mb); m.classList.add('tgs', 'emx');
  const cats = Object.keys(PCH_EMOJI); let cat = cats[0], q = '';
  const items = c => PCH_EMOJI[c].split('|').map(s => { const i = s.indexOf(' '); return { e: s.slice(0, i), n: s.slice(i + 1) }; });
  const all = cats.flatMap(items);
  const draw = () => {
    const list = q ? all.filter((x, i) => (x.n.includes(q) || x.e === q) && all.findIndex(y => y.e === x.e) === i) : items(cat);
    $('#emg', m).innerHTML = list.length ? list.map(x => `<button data-e="${x.e}" title="${esc(x.n)}" class="${S.me.emoji === x.e ? 'on' : ''}"><span>${x.e}</span></button>`).join('') : '<p class="emx-empty">Ничего не найдено</p>';
    $$('#emt button', m).forEach(b => b.classList.toggle('on', !q && b.dataset.t === cat));
    $$('#emg [data-e]', m).forEach(b => b.onclick = () => pick(b.dataset.e));
  };
  const pick = async e => { try { await api('/me/emoji-status', { emoji: e }); await refreshMe(); mb.close(); toast(e ? 'Эмодзи-статус установлен' : 'Эмодзи-статус убран'); done && done(e); loadChats(); } catch (er) { toast(er.message, true); } };
  m.innerHTML = `<div class="mh"><h2>Эмодзи-статус</h2><button class="ico" id="cx">${I.close}</button></div>
    <div class="emx-cur"><span class="est-big">${esc(S.me.emoji || '⭐')}</span><div><b>${esc(S.me.name)}</b><small>Показывается рядом с именем у всех</small></div></div>
    <input id="emq" class="emx-q" placeholder="Поиск эмодзи" autocomplete="off">
    <div class="emx-tabs" id="emt">${cats.map(c => `<button data-t="${c}">${esc(c)}</button>`).join('')}</div>
    <div class="emx-grid" id="emg"></div>
    <div class="foot"><button class="btn ghost" id="emr">Убрать статус</button></div>`;
  $('#cx', m).onclick = mb.close; $('#emr', m).onclick = () => pick('');
  $('#emq', m).oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  $$('#emt button', m).forEach(b => b.onclick = () => { cat = b.dataset.t; q = ''; $('#emq', m).value = ''; draw(); });
  draw();
}

async function pickPersonalChannel(curId, done) {
  const mb = modal(''), m = $('.modal', mb); m.classList.add('tgs');
  const mine = (S.chats || []).filter(c => c.type === 'channel' && (c.owner === S.me.id || (c.admins || []).includes(S.me.id)));
  const row = c => `<div class="sr pcr ${c.username ? '' : 'off'}" data-c="${c.id}"><i>${I.channel}</i><span>${esc(c.title)}<small style="display:block;color:var(--muted)">${c.username ? '@' + esc(c.username) : 'Нет публичной ссылки — сделайте канал публичным'}</small></span>${c.id === curId ? `<em>${I.check || '✓'}</em>` : ''}</div>`;
  m.innerHTML = `<div class="mh"><h2>Личный канал</h2><button class="ico" id="cx">${I.close}</button></div>
    <p class="hint" style="padding:0 20px">Выберите канал, который будет показан в вашем профиле. Подходят только публичные каналы, где вы владелец или админ.</p>
    <div class="grp">${mine.length ? mine.map(row).join('') : '<p style="color:var(--muted);text-align:center;padding:18px">У вас пока нет каналов. Создайте канал в меню ☰ → «Создать канал».</p>'}</div>
    ${curId ? '<div class="foot"><button class="btn ghost" id="pcx">Убрать канал из профиля</button></div>' : ''}`;
  $('#cx', m).onclick = mb.close;
  $('#pcx', m)?.addEventListener('click', () => { mb.close(); done(null); });
  $$('[data-c]', m).forEach(b => b.onclick = () => { const c = mine.find(z => z.id === b.dataset.c); if (!c.username) return toast('Сначала сделайте канал публичным (задайте @username)', true); mb.close(); done(c); });
}
