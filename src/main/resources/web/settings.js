'use strict';
/* LimeGram — «Настройки» в стиле Telegram Desktop: главный экран + подстраницы (перекрывает openSettings из app.js) */
Object.assign(I, {
  chat: _p('<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.3A7.5 7.5 0 1 1 20 11.5z"/>'),
  folder: _p('<path d="M3.5 7a2 2 0 0 1 2-2H10l2 2.5h6.5a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  sliders: _p('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  volume: _p('<path d="M4 10v4h3.5l5 4V6l-5 4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  battery: _p('<rect x="3" y="7.5" width="16" height="9" rx="2.2"/><path d="M21.5 11v2M10 9.5l-2 3h3.5l-2 3"/>'),
  eye: _p('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  shop: _p('<path d="M4 9l1.5-4.5h13L20 9M4 9v10.5h16V9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 19.5V14h4v5.5"/>'),
  help: _p('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 16.8h.01"/>'),
  bulb: _p('<path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3.5z"/>'),
  device: _p('<rect x="3" y="5" width="13" height="10" rx="1.8"/><path d="M1.5 18.5h16M18.5 8h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>'),
});

/* Строки приватности: [ключ, название, подсказка, поддерживается сервером] */
const SET_PRIV = [
  ['phoneSearch', 'Номер телефона', 'Кто может найти вас по номеру телефона', 1],
  ['lastSeen', 'Время захода', 'Кто видит, когда вы были в сети', 1],
  ['photos', 'Фотографии профиля', 'Кто видит ваше фото', 1], ['forwards', 'Пересылка сообщений', 'Кто может пересылать ваши сообщения', 1], ['calls', 'Звонки', 'Кто может вам звонить', 1],
  ['voices', 'Голосовые сообщения', 'Кто может присылать голосовые', 1], ['messages', 'Сообщения', 'Кто может писать вам первым', 1], ['birthday', 'День рождения', 'Кто видит дату рождения', 1],
  ['gifts', 'Подарки', 'Кто видит ваши подарки', 1], ['about', 'О себе', 'Кто видит описание профиля', 1],
  ['music', 'Сохранённая музыка', 'Кто видит вашу музыку', 1], ['invites', 'Приглашения', 'Кто может приглашать вас в группы', 1],
];
const plN = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return n + ' ' + (a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]); };
const privVal = k => ((S.me.privacy || {})[k] === 'nobody' ? 'Никто' : 'Все');

/* Масштаб, анимации: применяются поверх applySettings из app.js */
const _applyBase = applySettings;
applySettings = function () {
  _applyBase();
  const st = S.settings, root = document.documentElement;
  root.classList.toggle('no-anim', st.anim === '0');
  const z = st.zoomDef === '0' ? (+st.zoom || 100) : 100;
  root.style.zoom = z === 100 ? '' : String(z / 100);
};
applySettings();

function openSettings(tab) {
  const stack = [tab === 'privacy' ? 'privacy' : tab === 'profile' ? 'account' : 'root'];
  const mb = modal(''), m = $('.modal', mb); m.classList.add('tgs'); if (tab === 'profile') m.classList.add('profile-editor');
  const _close0 = mb.close; mb.close = () => { if (m._cl) { m._cl(); m._cl = null; } _close0(); };
  let color = S.me.color, searching = false;
  const st = () => S.settings, cur = () => stack[stack.length - 1];
  const nav = p => { stack.push(p); draw(true); };
  const back = () => { if (stack.length > 1) { stack.pop(); draw(true); } else mb.close(); };
  const soon = () => toast('Эта настройка появится в следующей версии');

  const R = (id, ic, label, val, o = {}) => `<button class="sr${o.red ? ' red' : ''}${ic ? '' : ' ni'}" data-go="${id}">${ic ? `<i>${I[ic]}</i>` : ''}<span>${label}</span>${val != null ? `<em class="${o.dim ? 'dim' : ''}">${val}</em>` : ''}</button>`;
  const isOn = (k, d = 1) => { const v = st()[k]; return v === undefined ? !!d : v !== '0'; };
  const T = (key, ic, label, sub, on, def) => `<div class="sr tr${ic ? '' : ' ni'}">${ic ? `<i>${I[ic]}</i>` : ''}<span>${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="tgl ${on ? 'on' : ''}" data-tg="${key}"${def === 0 ? ' data-def="0"' : ''}></span></div>`;
  const C = (key, label, def = 1) => `<button class="cbr ${isOn(key, def) ? 'on' : ''}" data-tg="${key}"${def === 0 ? ' data-def="0"' : ''}><i class="cbx"></i><span>${label}</span></button>`;
  const radio = (name, items, val) => items.map(([v, l]) => `<button class="sr rd" data-rd="${name}" data-v="${v}"><span>${l}</span><i class="rdo ${val === v ? 'on' : ''}"></i></button>`).join('');
  const seg = (id, items, val) => `<div class="seg" id="${id}">${items.map(([k, v]) => `<button data-v="${k}" class="${val === k ? 'on' : ''}">${v}</button>`).join('')}</div>`;
  const blocked = () => S.chats.filter(c => c.blocked && c.peer);

  const ACTS = {
    premium: () => { mb.close(); openPremium(); },
    stars: () => { mb.close(); openStars(); },
    gifts: () => { mb.close(); openGifts(); },
    business: () => toast('LimeGram для бизнеса появится позже'),
    logout: async () => { if (await confirmBox('Выйти из аккаунта?', 'Выйти', true)) { try { await api('/auth/logout', {}); } catch { } mb.close(); localLogout(); } },
  };

  const pages = {
    root: () => ({
      t: 'Настройки',
      h: `<div class="prof">${userAv(S.me, 'lg').replace('<i class="on-dot"></i>', '')}<div class="pi"><b>${esc(S.me.name)}</b><div>${esc(fmtPhone(S.me.phone))}</div><div class="mu">${S.me.username ? '@' + esc(S.me.username) : ''}</div></div></div>
      <div class="grp">${R('account', 'user', 'Мой аккаунт')}${R('notif', 'bell', 'Уведомления и звуки')}${R('privacy', 'lock', 'Конфиденциальность')}${R('chats', 'chat', 'Настройки чатов')}${R('folders', 'folder', 'Папки с чатами')}${R('advanced', 'sliders', 'Продвинутые настройки')}${R('sound', 'volume', 'Звук и камера')}${R('battery', 'battery', 'Заряд батареи и анимация')}${R('language', 'globe', 'Язык', 'Русский')}</div>
      <div class="grp">${T('zoomDef', 'eye', 'Масштаб по умолчанию', '', st().zoomDef !== '0')}<div class="zrow"><input type="range" id="zm" min="75" max="150" step="5" value="${st().zoomDef === '0' ? (+st().zoom || 100) : 100}" ${st().zoomDef !== '0' ? 'disabled' : ''}><b id="zv">${st().zoomDef === '0' ? (+st().zoom || 100) : 100}%</b></div></div>
      <div class="grp">${R('premium', 'star', 'LimeGram Premium')}${R('stars', 'star', 'Мои звёзды')}${R('business', 'shop', 'LimeGram для бизнеса')}${R('gifts', 'gift', 'Отправить подарок')}</div>
      <div class="grp">${R('faq', 'help', 'Вопросы о LimeGram')}${R('features', 'bulb', 'Возможности LimeGram')}${R('logout', 'logout', 'Выйти из аккаунта', null, { red: 1 })}</div>`,
      b: () => {
        $('.prof', m)?.addEventListener('click', () => { mb.close(); openUserInfo(S.me.id); });
        $('#zm', m)?.addEventListener('input', e => { $('#zv', m).textContent = e.target.value + '%'; });
        $('#zm', m)?.addEventListener('change', e => saveSettings({ zoom: e.target.value }));
      },
    }),

    account: () => ({
      t: 'Информация',
      h: `<div class="profile-edit-page">
        <div class="profile-edit-hero">
          <button class="profile-photo-btn" id="profile-photo-open" type="button" title="Открыть фотографию">${userAv(S.me, 'profile-photo').replace('<i class="on-dot"></i>', '')}</button>
          <label class="profile-camera" for="avatar-file" title="Изменить фотографию">${I.edit}</label>
          <input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
          <h2>${esc(S.me.name)}${badges(S.me)}</h2>
          <small>${S.me.username ? '@' + esc(S.me.username) : 'Имя пользователя не задано'}</small>
        </div>
        <div class="profile-edit-list">
          <label class="profile-row"><span>Имя</span><input id="pn" maxlength="64" value="${esc(S.me.name)}"></label>
          <div class="profile-row readonly"><span>Номер телефона</span><b>${esc(fmtPhone(S.me.phone))}</b></div>
          <label class="profile-row"><span>Имя пользователя</span><input id="pu" maxlength="32" placeholder="@username" value="${S.me.username ? '@' + esc(S.me.username) : ''}"></label><div class="un-st" id="pus" style="padding:0 16px"></div>
          <label class="profile-row profile-row-about"><span>О себе</span><textarea id="pb" maxlength="${S.me.premium ? 500 : 200}" rows="3" placeholder="Любые подробности о себе">${esc(S.me.bio || '')}</textarea></label>
          <div class="profile-row pick" id="pchRow" role="button" tabindex="0"><span>Личный канал</span><b id="pchVal">${S.me.pchannel ? esc(S.me.pchannel.title) + ' · @' + esc(S.me.pchannel.username) : 'Не указан'}</b></div>
          <div class="profile-row pick" id="estRow" role="button" tabindex="0"><span>Эмодзи-статус</span><b id="estVal">${S.me.premium ? (S.me.emoji ? `<span class="est-big">${esc(S.me.emoji)}</span>` : 'Не выбран') : '🔒 Premium'}</b></div>
          <div class="profile-row"><span>Цвет имени</span><div class="sw profile-sw" id="sw">${(S.me.premium ? COLORS.concat(PCOLORS) : COLORS).map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${c === color ? 'on' : ''}" aria-label="${c}"></button>`).join('')}</div></div>
        </div>
        <div class="profile-avatar-actions"><label class="btn ghost" for="avatar-file">Изменить фотографию</label><button class="btn ghost" id="avatar-clear" type="button">Удалить фотографию</button><small>PNG, JPEG, WebP или GIF · до 300 КБ</small></div>
        <div class="err" id="pe"></div><button class="btn profile-save" id="ps">Сохранить</button>
      </div>`,
      b: () => {
        unameBind(m, '#pu', '#pus', '');
        let pch = S.me.pchannel ? S.me.pchannel.id : '';
        $('#pchRow', m).onclick = () => pickPersonalChannel(pch, ch => { pch = ch ? ch.id : ''; $('#pchVal', m).textContent = ch ? ch.title + ' · @' + ch.username : 'Не указан'; });
        $('#estRow', m).onclick = () => { if (!S.me.premium) return openPremium(); openEmojiStatusPicker(e => { $('#estVal', m).innerHTML = e ? `<span class="est-big">${esc(e)}</span>` : 'Не выбран'; }); };
        let avatar = S.me.avatar || '';
        const fileInput = $('#avatar-file', m);
        const refreshAvatar = () => {
          const holder = $('#profile-photo-open', m);
          if (holder) holder.innerHTML = userAv({ ...S.me, avatar }, 'profile-photo').replace('<i class="on-dot"></i>', '');
          $('#profile-photo-open', m)?.classList.toggle('has-photo', !!avatar);
        };
        fileInput.onchange = () => { const f = fileInput.files?.[0]; if (!f) return; if (f.size > 300 * 1024) { toast('Максимальный размер аватара — 300 КБ', true); fileInput.value = ''; return; } const r = new FileReader(); r.onload = () => { avatar = String(r.result); refreshAvatar(); }; r.readAsDataURL(f); };
        $('#avatar-clear', m).onclick = () => { avatar = ''; refreshAvatar(); };
        $('#profile-photo-open', m)?.addEventListener('click', () => {
          const img = $('.av-img', $('#profile-photo-open', m));
          if (img) openMediaLightbox(img.src);
        });
        $$('#sw [data-c]', m).forEach(b => b.onclick = () => { color = b.dataset.c; $$('#sw [data-c]', m).forEach(x => x.classList.toggle('on', x === b)); });
        $('#ps', m).onclick = async () => { try { S.me = { ...S.me, ...(await api('/me/update', { name: $('#pn', m).value, username: $('#pu', m).value, bio: $('#pb', m).value, color, avatar, pchannel: pch })) }; toast('Профиль сохранён'); loadChats(); } catch (er) { $('#pe', m).textContent = er.message; } };
      },
    }),

    notif: () => {
      const exc = t => S.chats.filter(c => (t === 'private' ? (c.type === 'private' || c.type === 'saved') : c.type === t) && prefs(c).muted).length;
      const sub = (k, t) => { if (st()[k] === '0') return 'Отключены'; const n = t ? exc(t) : 0; return 'Включены' + (n ? ', ' + plN(n, ['исключение', 'исключения', 'исключений']) : ''); };
      const vol = st().volume === undefined ? 100 : +st().volume, nm = isOn('notifName'), tx = isOn('notifText');
      return {
        t: 'Уведомления и звуки',
        h: `<div class="sh">Показывать уведомления</div>${T('notifAll', null, 'Всех аккаунтов', '', isOn('notifAll'))}
        <div class="hint">Отключите, если хотите получать только уведомления активного аккаунта.</div>
        <div class="sh">Общие настройки</div>${T('notify', 'bell', 'Уведомления на рабочем столе', '', isOn('notify'))}${T('trayAnim', 'device', 'Анимация иконки на панели задач', '', isOn('trayAnim'))}${T('sounds', 'volume', 'Звук', '', isOn('sounds'))}
        <div class="sh">Громкость</div><div class="volrow"><input type="range" id="vl" min="0" max="100" value="${vol}"><b id="vv">${vol}%</b></div>
        <div class="npv"><div class="ncard"><div class="av sm" style="background:#6bbf59">Д</div><div class="nt"><b>${nm ? 'Дино' : 'LimeGram'}</b><div>${tx ? 'В Токио утро 😎' : 'Новое сообщение'}</div></div></div>
        <div class="nchips"><button class="chip2 ${nm ? 'on' : ''}" data-nc="notifName">${I.check}Имя</button><button class="chip2 ${tx ? 'on' : ''}" data-nc="notifText">${I.check}Текст</button></div></div>
        <div class="sh">Уведомления из чатов</div>${T('nfPriv', 'user', 'Личные чаты', sub('nfPriv', 'private'), isOn('nfPriv'))}${T('nfGroup', 'users', 'Группы', sub('nfGroup', 'group'), isOn('nfGroup'))}${T('nfChan', 'broadcast', 'Каналы', sub('nfChan', 'channel'), isOn('nfChan'))}${T('nfReact', 'smileplus', 'Реакции', 'Сообщения, Голоса в опросах', isOn('nfReact'))}
        <div class="sh">События</div>${T('evJoin', 'plus', 'Контакт присоединился к LimeGram', '', isOn('evJoin', 0), 0)}${T('evPin', 'pin', 'Закреплённые сообщения', '', isOn('evPin'))}`,
        b: () => {
          $('#vl', m).addEventListener('input', e => { $('#vv', m).textContent = e.target.value + '%'; });
          $('#vl', m).addEventListener('change', e => { saveSettings({ volume: e.target.value }); beep(); });
          $$('[data-nc]', m).forEach(b => b.onclick = () => { saveSettings({ [b.dataset.nc]: isOn(b.dataset.nc) ? '0' : '1' }); draw(); });
          $$('[data-tg="nfPriv"],[data-tg="nfGroup"],[data-tg="nfChan"]', m).forEach(b => b.dataset.redraw = '1');
        },
      };
    },

    privacy: () => ({
      t: 'Конфиденциальность',
      h: `<div class="sh">Безопасность</div>${R('cloudpw', 'shield', 'Облачный пароль', S.me.hasPassword ? 'Вкл.' : 'Выкл.')}${R('autodel', 'clock', 'Автоудаление сообщений', S.chats.some(c => c.ttl) ? 'Вкл.' : 'Выкл.')}${R('passcode', 'lock', 'Код-пароль', localStorage.getItem('lg_pass') ? 'Вкл.' : 'Выкл.')}${R('keys', 'key', 'Ключи доступа', 'Нет')}${R('blocked', 'ban', 'Заблокированные пользователи', blocked().length)}${R('sites', 'globe', 'Авторизованные сайты', '0')}${R('sessions', 'device', 'Активные сеансы')}
      <div class="hint">Управление сеансами на всех подключённых устройствах.</div>
      <div class="sh">Конфиденциальность</div>${SET_PRIV.map(([k, t, , ok]) => ok ? R('pv:' + k, null, t, privVal(k)) : R('soon:' + k, null, t, 'Скоро', { dim: 1 })).join('')}`,
    }),

    keys: () => ({ t: 'Ключи доступа', h: `<div class="pad"><p class="mu">Ключи доступа (passkeys) работают только по HTTPS и с доменом сервера. Для локального запуска они недоступны; для публичного сервера нужна настройка WebAuthn.</p></div>` }),
    sites: () => ({ t: 'Авторизованные сайты', h: `<div class="pad mu">Вы не входили на сторонние сайты через LimeGram.</div>` }),
    sessions: () => {
      if (!m._ses && !m._sl) { m._sl = 1; api('/me/sessions').then(r => { m._ses = r; if (cur() === 'sessions') draw(); }).catch(fail); }
      const l = m._ses || [], now = l.find(x => x.current), oth = l.filter(x => !x.current);
      const row = x => `<div class="sr"><i>${I.device}</i><span>${esc(x.label || 'Устройство')}<small>${fmtDT(x.at)}</small></span>${x.current ? '' : `<button class="mini-b" data-ts="${esc(x.id)}">Завершить</button>`}</div>`;
      return { t: 'Активные сеансы', h: `<div class="sh">Это устройство</div>${now ? row(now) : '<div class="pad mu">Загрузка…</div>'}${oth.length ? `<button class="sr red" id="tsa"><i>${I.logout}</i><span>Завершить все другие сеансы</span></button><div class="sh">Другие сеансы</div>${oth.map(row).join('')}` : ''}`,
        b: () => { const go = async b => { try { await api('/me/sessions/end', b); m._ses = null; m._sl = 0; draw(); } catch (er) { fail(er); } };
          $$('[data-ts]', m).forEach(b => b.onclick = () => go({ id: b.dataset.ts })); $('#tsa', m)?.addEventListener('click', () => go({ all: true })); } };
    },
    cloudpw: () => ({
      t: 'Облачный пароль',
      h: `<div class="pad"><p class="mu">${S.me.hasPassword ? 'Облачный пароль включён. Он запрашивается при входе после кода.' : 'Облачный пароль не задан. Установите его, чтобы защитить вход.'} Пустое поле «новый» отключает пароль.</p>
      ${S.me.hasPassword ? '<label class="field">Текущий пароль<input id="po" type="password" autocomplete="current-password"></label>' : ''}<label class="field">Новый пароль (мин. 6 символов)<input id="pw" type="password" autocomplete="new-password"></label><div class="err" id="pwe"></div><button class="btn" id="pp">Сменить пароль</button></div>`,
      b: () => $('#pp', m).onclick = async () => { try { const r = await api('/me/password', { old: $('#po', m)?.value || '', new: $('#pw', m).value }); S.me.hasPassword = r.hasPassword; toast(r.hasPassword ? 'Облачный пароль обновлён' : 'Облачный пароль отключён'); draw(); } catch (er) { $('#pwe', m).textContent = er.message; } },
    }),

    autodel: () => {
      const l = S.chats.filter(c => c.ttl);
      return {
        t: 'Автоудаление сообщений',
        h: `<div class="hint">Автоудаление включается для каждого чата отдельно: меню ⋮ в чате → «Автоудаление».</div>${l.map(c => `<div class="sr"><span>${esc(c.peer ? c.peer.name : c.title || 'Чат')}</span><em>${ttlLabel(c.ttl)}</em></div>`).join('') || '<div class="pad mu">Ни в одном чате автоудаление не включено.</div>'}`,
      };
    },

    passcode: () => ({ t: 'Код-пароль', h: `<div class="pad">${passBody()}</div>`, b: () => bindPass(m, draw) }),

    blocked: () => ({
      t: 'Заблокированные',
      h: blocked().map(c => `<div class="sr">${userAv(c.peer, 'sm').replace('<i class="on-dot"></i>', '')}<span>${esc(c.peer.name)}</span><button class="mini-b" data-ub="${esc(c.peer.id)}">Разблокировать</button></div>`).join('') || '<div class="pad mu">Вы никого не заблокировали.</div>',
      b: () => $$('[data-ub]', m).forEach(b => b.onclick = async () => { await blockUser(b.dataset.ub, false); draw(); }),
    }),

    pv: k => {
      const row = SET_PRIV.find(x => x[0] === k), v = (S.me.privacy || {})[k] === 'nobody' ? 'nobody' : 'all';
      return {
        t: row[1], h: `<div class="sh">${row[2]}</div>${radio(k, [['all', 'Все'], ['nobody', 'Никто']], v)}`,
        b: () => $$('[data-rd]', m).forEach(b => b.onclick = async () => { try { await api('/me/privacy', { key: k, value: b.dataset.v }); S.me.privacy = { ...(S.me.privacy || {}), [k]: b.dataset.v }; back(); } catch (er) { fail(er); } }),
      };
    },

    chats: () => {
      const tsty = st().tsty || (document.documentElement.dataset.theme === 'dark' ? 'color' : 'day');
      const acc = st().accent || '#3390ec';
      const nmode = { auto: 'Системная', light: 'Выключена', dark: 'Включена' }[st().theme || 'auto'];
      const fnt = { def: 'По умолчанию', sys: 'Системный', serif: 'С засечками', mono: 'Моноширинный' }[st().font || 'def'];
      const wall = !!localStorage.getItem('lg_wall') && st().wall === '1';
      return {
        t: 'Настройки чатов',
        h: `<div class="sh">Темы</div><div class="tcards">${[['classic', 'Классика'], ['day', 'Дневная'], ['color', 'Цветная'], ['night', 'Ночная']].map(([k, n]) => `<button class="tc ${k} ${tsty === k ? 'on' : ''}" data-ts="${k}"><div class="tcv"><i class="b1"></i><i class="b2"></i><i class="rr"></i></div><span>${n}</span></button>`).join('')}</div>
        <div class="sw acc" id="ac">${ACCENTS.map(c => `<button data-c="${c}" style="background:${c}" class="${acc === c && st().sysAccent !== '1' ? 'on' : ''}"></button>`).join('')}<label class="custom" title="Свой цвет"><input type="color" id="acc-c" value="${acc}"></label></div>
        ${C('sysAccent', 'Системный цвет акцентов', 0)}
        <div class="grp"><div class="sh">Настройки темы</div>
        <button class="sr" data-go="account"><i>${I.palette}</i><span>Цвет имени</span><b class="npill" style="background:${esc(S.me.color)}33;color:${esc(S.me.color)}">${esc(S.me.name)}</b></button>
        ${R('nightmode', 'moon', 'Смена темы на ночную', nmode)}${R('font', 'text', 'Семейство шрифтов', fnt)}
        <div class="pad"><div style="margin-bottom:6px">Размер текста: <b id="fsv">${st().fontSize || 15}</b> px</div><input type="range" id="fs" min="13" max="19" value="${st().fontSize || 15}" style="width:100%;accent-color:var(--primary)"></div></div>
        <div class="grp"><div class="sh">Обои для чатов</div><div class="wallrow"><div class="wprev ${wall ? 'img' : ''}" ${wall ? `style="background-image:url('${localStorage.getItem('lg_wall')}')"` : ''}></div><div class="wl"><button class="lnk" data-go="wall">Выбрать из галереи</button><button class="lnk" id="wf">Выбрать файл</button></div></div><input type="file" id="wfi" accept="image/*" hidden>${C('wideAlign', 'Выравнивание для широких экранов', 1)}</div>
        <div class="grp"><div class="sh">Быстрое действие с чатом</div>${R('quick', 'folder', 'Сменить папку')}<div class="hint">Действие, которое будет выполняться при нажатии средней кнопкой мыши или смахивании влево в списке чатов.</div></div>
        <div class="grp"><div class="sh">Стикеры и эмодзи</div>${C('bigEmoji', 'Крупные эмодзи', 1)}${C('autoEmoji', 'Автозамена эмодзи', 1)}</div>`,
        b: () => {
          $$('[data-ts]', m).forEach(b => b.onclick = () => { const k = b.dataset.ts; saveSettings({ tsty: k, theme: (k === 'classic' || k === 'day') ? 'light' : 'dark' }); draw(); });
          $$('#ac [data-c]', m).forEach(b => b.onclick = () => { saveSettings({ accent: b.dataset.c, sysAccent: '0' }); draw(); });
          $('#acc-c', m).addEventListener('change', e => { saveSettings({ accent: e.target.value, sysAccent: '0' }); draw(); });
          $('#fs', m).addEventListener('input', e => { $('#fsv', m).textContent = e.target.value; saveSettings({ fontSize: e.target.value }); });
          $('#wf', m).onclick = () => $('#wfi', m).click();
          $('#wfi', m).onchange = e => {
            const f = e.target.files[0]; if (!f) return; if (f.size > 3e6) return toast('Файл больше 3 МБ', true);
            const r = new FileReader();
            r.onload = () => { try { localStorage.setItem('lg_wall', r.result); saveSettings({ wall: '1' }); draw(); toast('Обои установлены'); } catch { toast('Не удалось сохранить обои', true); } };
            r.readAsDataURL(f);
          };
          $$('[data-tg="sysAccent"]', m).forEach(b => b.dataset.redraw = '1');
        },
      };
    },

    nightmode: () => ({
      t: 'Смена темы на ночную',
      h: `${radio('nm', [['auto', 'Системная'], ['light', 'Выключена'], ['dark', 'Включена']], st().theme || 'auto')}<div class="hint">«Системная» — тема меняется вместе с темой вашей системы.</div>`,
      b: () => $$('[data-rd="nm"]', m).forEach(b => b.onclick = () => { saveSettings({ theme: b.dataset.v, tsty: '' }); draw(); }),
    }),

    font: () => ({
      t: 'Семейство шрифтов',
      h: radio('fn', [['def', 'По умолчанию'], ['sys', 'Системный'], ['serif', 'С засечками'], ['mono', 'Моноширинный']], st().font || 'def'),
      b: () => $$('[data-rd="fn"]', m).forEach(b => b.onclick = () => { saveSettings({ font: b.dataset.v }); draw(); }),
    }),

    wall: () => ({
      t: 'Обои для чатов',
      h: radio('wl', [['pat', 'Узор'], ['grad', 'Градиент'], ['flat', 'Однотонный']], st().wall === '1' ? '' : (st().bg || 'pat')),
      b: () => $$('[data-rd="wl"]', m).forEach(b => b.onclick = () => { saveSettings({ bg: b.dataset.v, wall: '0' }); renderMain(); draw(); }),
    }),

    quick: () => ({
      t: 'Быстрое действие с чатом',
      h: radio('qk', [['folder', 'Сменить папку'], ['archive', 'В архив'], ['pin', 'Закрепить'], ['mute', 'Отключить звук'], ['read', 'Прочитать']], st().quick || 'folder') + '<div class="hint">Действие, которое будет выполняться при нажатии средней кнопкой мыши или смахивании влево в списке чатов.</div>',
      b: () => $$('[data-rd="qk"]', m).forEach(b => b.onclick = () => { saveSettings({ quick: b.dataset.v }); draw(); }),
    }),

    folders: () => {
      const cnt = k => S.chats.filter(c => { const sv = S.folder; S.folder = k; const r = chatMatches(c); S.folder = sv; return r; }).length;
      return { t: 'Папки с чатами', h: `<div class="hint">Папки формируются автоматически по типу чата. Свои папки пока не поддерживаются.</div>${FOLDERS.map(([k, n]) => `<div class="sr"><i>${I.folder}</i><span>${n}</span><em>${cnt(k)}</em></div>`).join('')}` };
    },

    advanced: () => ({
      t: 'Продвинутые настройки',
      h: `<div class="sh">Данные и память</div>${R('soon:conn', 'refresh', 'Тип соединения', 'по умолчанию (TCP)')}${R('soon:path', 'folder', 'Путь для сохранения', 'по умолчанию')}${R('mem', 'archive', 'Управление памятью устройства')}${R('soon:dl', 'down', 'Загрузки')}${T('askPath', null, 'Спрашивать путь для сохранения файла', '', isOn('askPath', 0), 0)}
      <div class="grp"><div class="sh">Автозагрузка медиа</div>${T('auPriv', 'user', 'В личных чатах', '', isOn('auPriv'))}${T('auGroup', 'users', 'В группах', '', isOn('auGroup'))}${T('auChan', 'broadcast', 'В каналах', '', isOn('auChan'))}</div>
      <div class="grp"><div class="sh">Название окна</div>${C('winChat', 'Показывать название чата', 1)}${C('winAcc', 'Показывать активный аккаунт', 1)}${C('winCnt', 'Счётчик непрочитанных сообщений', 1)}${C('winFrame', 'Системная рамка окна', 0)}</div>
      <div class="grp"><div class="sh">Интеграция в систему</div>${C('trayIcon', 'Показывать иконку в трее', 1)}${C('taskIcon', 'Показывать иконку на панели задач', 1)}${C('monoIcon', 'Использовать монохромную иконку', 1)}${C('autostart', 'Запускать LimeGram при запуске системы', 0)}${C('restoreWin', 'Восстанавливать последние окна', 0)}${C('sendTo', 'Добавить в меню «Отправить…»', 0)}</div>
      <div class="grp"><div class="sh">Отправка сообщений</div>${radio('send', [['enter', 'Enter — отправить, Shift+Enter — новая строка'], ['ctrl', 'Ctrl+Enter — отправить, Enter — новая строка']], st().sendMode === 'ctrl' ? 'ctrl' : 'enter')}</div>
      <div class="grp"><div class="sh">Данные</div><button class="sr" id="cd"><i>${I.trash}</i><span>Очистить черновики</span></button><button class="sr red" id="rs"><i>${I.refresh}</i><span>Сбросить настройки оформления</span></button></div>`,
      b: () => {
        $$('[data-rd="send"]', m).forEach(b => b.onclick = () => { saveSettings({ sendMode: b.dataset.v }); draw(); });
        $('#cd', m).onclick = () => { S.drafts = {}; toast('Черновики очищены'); };
        $('#rs', m).onclick = async () => { if (!(await confirmBox('Сбросить тему, цвет, фон, размер текста и масштаб?', 'Сбросить', true))) return; localStorage.removeItem('lg_wall'); saveSettings({ theme: 'auto', tsty: '', accent: '#3390ec', sysAccent: '0', font: 'def', wall: '0', bg: 'pat', fontSize: '15', zoomDef: '1', zoom: '100', anim: '1' }); draw(); renderMain(); };
        $$('[data-tg="winChat"],[data-tg="winAcc"],[data-tg="winCnt"]', m).forEach(b => b.addEventListener('click', () => setTimeout(updateTitle, 0)));
      },
    }),

    mem: () => {
      let wl = 0; try { wl = (localStorage.getItem('lg_wall') || '').length; } catch { }
      return {
        t: 'Управление памятью',
        h: `<div class="pad"><p class="mu">Сообщения и пользователи кэшируются в памяти приложения на время сеанса. Очистка не удаляет ничего с сервера.</p></div>
        <button class="sr" id="mc1"><i>${I.refresh}</i><span>Очистить кэш чатов<small>Кроме открытого чата</small></span></button>
        <button class="sr red" id="mc2"><i>${I.trash}</i><span>Удалить свои обои${wl ? '<small>' + fmtSize(wl) + '</small>' : ''}</span></button>`,
        b: () => {
          $('#mc1', m).onclick = () => { Object.keys(S.msgs).forEach(k => { if (k !== S.active) { delete S.msgs[k]; delete S.more[k]; } }); toast('Кэш очищен'); };
          $('#mc2', m).onclick = () => { localStorage.removeItem('lg_wall'); saveSettings({ wall: '0' }); applySettings(); toast('Обои удалены'); draw(); };
        },
      };
    },

    sound: () => {
      const devs = m._devs || [];
      const nameOf = (kind, key) => { const d = devs.find(x => x.kind === kind && x.deviceId === st()[key]); return d ? (d.label || 'Устройство') : 'По умолчанию'; };
      if (!m._devs && !m._devLoading) { m._devLoading = true; (navigator.mediaDevices ? navigator.mediaDevices.enumerateDevices() : Promise.reject()).then(l => { m._devs = l; if (cur() === 'sound') draw(); }).catch(() => { m._devs = []; }); }
      return {
        t: 'Звук и камера',
        h: `<div class="sh">Колонки и наушники</div>${R('dev:audiooutput', null, 'Устройство воспроизведения', esc(nameOf('audiooutput', 'audioOut')))}
        <div class="grp0"><div class="sh">Микрофон</div>${R('dev:audioinput', null, 'Устройство записи', esc(nameOf('audioinput', 'audioIn')))}<div class="meter" id="mtr">${'<i></i>'.repeat(34)}</div></div>
        <div class="grp0"><div class="sh">Звонки и видеочаты</div>${T('callDev', null, 'Использовать эти устройства для звонков', '', isOn('callDev'))}</div>
        <div class="grp0"><div class="sh">Камера</div>${R('dev:videoinput', null, 'Устройство записи', esc(nameOf('videoinput', 'videoIn')))}</div>
        <div class="grp0"><div class="sh">Другие настройки</div>${T('callRecv', null, 'Приём звонков на этом устройстве', '', isOn('callRecv'))}<button class="sr ni" data-go="soon:sys"><span>Перейти к системным настройкам звука</span></button></div>`,
        b: async () => {
          const bars = $$('#mtr i', m); let stop = false, ctx, stream;
          m._cl = () => { stop = true; try { stream && stream.getTracks().forEach(t => t.stop()); ctx && ctx.close(); } catch { } };
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: st().audioIn ? { deviceId: { exact: st().audioIn } } : true });
            if (stop) { m._cl(); return; }
            ctx = new (window.AudioContext || window.webkitAudioContext)(); const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
            const buf = new Uint8Array(an.fftSize);
            const tick = () => { if (stop) return; an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += Math.abs(v - 128); const n = Math.round(Math.min(1, s / buf.length / 30) * bars.length); bars.forEach((b, i) => b.classList.toggle('on', i < n)); requestAnimationFrame(tick); };
            tick();
          } catch { }
        },
      };
    },

    dev: kind => {
      const key = { audiooutput: 'audioOut', audioinput: 'audioIn', videoinput: 'videoIn' }[kind] || 'audioIn';
      const list = (m._devs || []).filter(d => d.kind === kind && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications');
      return {
        t: { audiooutput: 'Устройство воспроизведения', audioinput: 'Устройство записи', videoinput: 'Камера' }[kind] || 'Устройство',
        h: radio('dv', [['', 'По умолчанию'], ...list.map(d => [esc(d.deviceId), esc(d.label || 'Устройство')])], st()[key] || '') + (list.length ? '' : '<div class="hint">Других устройств не найдено или нет доступа к ним.</div>'),
        b: () => $$('[data-rd="dv"]', m).forEach(b => b.onclick = () => { saveSettings({ [key]: b.dataset.v }); back(); }),
      };
    },

    battery: () => {
      const G = [
        ['st', 'Анимация стикеров', 'smileplus', [['st1', 'В сообщениях'], ['st2', 'В панели стикеров']]],
        ['em', 'Анимация эмодзи', 'smile', [['em1', 'В сообщениях'], ['em2', 'В реакциях'], ['em3', 'В статусах'], ['em4', 'В панели эмодзи']]],
        ['ch', 'Анимация в чатах', 'chat', [['ch1', 'Появление сообщений'], ['ch2', 'Плавная прокрутка'], ['ch3', 'Эффекты фона']]],
      ];
      const ps = m._ps = m._ps || Object.fromEntries([...G.flatMap(g => g[3].map(x => x[0])), 'calls', 'anim'].map(k => [k, isOn(k)]));
      const open = m._psx = m._psx || {};
      const row = ([g, label, ic, subs]) => {
        const n = subs.filter(([k]) => ps[k]).length;
        return `<div class="sr psr"><button class="psl" data-psx="${g}"><i>${I[ic]}</i><span>${label}<b>${n}/${subs.length}</b><u class="chev ${open[g] ? 'up' : ''}"></u></span></button><s class="vsep"></s><span class="tgl ${n ? 'on' : ''}" data-psg="${g}"></span></div>${open[g] ? subs.map(([k, l]) => `<div class="sr tr sub"><span>${l}</span><span class="tgl ${ps[k] ? 'on' : ''}" data-psk="${k}"></span></div>`).join('') : ''}`;
      };
      const flat = (k, ic, l) => `<div class="sr tr"><i>${I[ic]}</i><span>${l}</span><span class="tgl ${ps[k] ? 'on' : ''}" data-psk="${k}"></span></div>`;
      return {
        t: 'Энергосбережение',
        h: `<div class="sh">Параметры энергосбережения</div>${G.map(row).join('')}${flat('calls', 'phone', 'Анимация звонков')}${flat('anim', 'play', 'Анимации интерфейса')}<div class="mfoot"><button id="psC">Отмена</button><button id="psS">Сохранить</button></div>`,
        b: () => {
          $$('[data-psx]', m).forEach(b => b.onclick = () => { open[b.dataset.psx] = !open[b.dataset.psx]; draw(); });
          $$('[data-psg]', m).forEach(b => b.onclick = () => { const g = G.find(x => x[0] === b.dataset.psg), any = g[3].some(([k]) => ps[k]); g[3].forEach(([k]) => ps[k] = !any); draw(); });
          $$('[data-psk]', m).forEach(b => b.onclick = () => { ps[b.dataset.psk] = !ps[b.dataset.psk]; draw(); });
          $('#psC', m).onclick = () => back();
          $('#psS', m).onclick = () => { saveSettings(Object.fromEntries(Object.entries(ps).map(([k, v]) => [k, v ? '1' : '0']))); toast('Сохранено'); back(); };
        },
      };
    },

    language: () => ({ t: 'Язык', h: `${radio('lang', [['ru', 'Русский']], 'ru')}<div class="hint">Другие языки интерфейса пока не добавлены.</div>` }),

    faq: () => ({
      t: 'Вопросы о LimeGram',
      h: [['Это Telegram?', 'Нет. LimeGram — отдельный мессенджер в стиле Telegram: свой сервер, свои аккаунты и протокол. С клиентами и серверами Telegram он не совместим.'],
      ['Где хранятся сообщения?', 'На сервере LimeGram, в JSON-файле, открытым текстом. Секретных чатов и сквозного шифрования нет.'],
      ['Как защитить вход?', 'Настройки → Конфиденциальность: облачный пароль (запрашивается при входе) и код-пароль (блокировка приложения).'],
      ['Как получить Premium?', 'Меню ☰ → LimeGram Premium. Покупается за звёзды; ежедневный бонус начисляется в разделе «Мои звёзды».'],
      ['Как скрыть время захода?', 'Настройки → Конфиденциальность → Время захода → «Никто».']].map(([q, a]) => `<details class="fq"><summary>${q}</summary><p>${a}</p></details>`).join(''),
    }),

    features: () => ({
      t: 'Возможности LimeGram',
      h: `<div class="pad"><ul class="ft"><li>Личные чаты, группы, каналы и «Избранное»</li><li>Ответы, правка, пересылка, закреп, реакции, опросы</li><li>Голосовые сообщения, фото, видео и файлы</li><li>Форматирование, спойлеры, крупные эмодзи, кубики 🎲</li><li>Автоудаление и отложенные сообщения</li><li>Код-пароль, облачный пароль, блокировка пользователей</li><li>Premium, звёзды и подарки</li><li>Темы, цвета акцента, масштаб интерфейса</li></ul></div>`,
    }),
  };

  const draw = anim => {
    if (m._cl) { m._cl(); m._cl = null; }
    if (cur() !== 'battery') { m._ps = null; m._psx = null; }
    const [pg, arg] = cur().split(':'), P = (pages[pg] || pages.root)(arg);
    const isRoot = pg === 'root';
    m.innerHTML = `<div class="th">${stack.length > 1 ? `<button class="ico" id="bk">${I.back}</button>` : ''}${isRoot && searching ? `<input id="sq" class="sin" placeholder="Поиск в настройках" autofocus>` : `<h2>${P.t}</h2>`}${isRoot ? `<button class="ico" id="sb">${I.search}</button><button class="ico" id="mo">${I.more}</button>` : ''}<button class="ico" id="cx">${I.close}</button></div><div class="tb"><div class="pg${anim ? ' go' : ''}">${P.h}</div></div>`;
    $('#cx', m).onclick = mb.close; $('#bk', m)?.addEventListener('click', back);
    $('#sb', m)?.addEventListener('click', () => { searching = !searching; draw(); });
    $('#mo', m)?.addEventListener('click', ACTS.logout);
    $('#sq', m)?.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      $$('.sr', m).forEach(r => r.style.display = !q || r.textContent.toLowerCase().includes(q) ? '' : 'none');
      $$('.grp', m).forEach(g => g.style.display = $$('.sr', g).some(r => r.style.display !== 'none') ? '' : 'none');
    });
    $$('[data-go]', m).forEach(b => b.onclick = () => { const id = b.dataset.go; if (id.startsWith('soon')) soon(); else if (ACTS[id]) ACTS[id](); else nav(id); });
    $$('[data-tg]', m).forEach(b => b.onclick = () => { const k = b.dataset.tg, on = isOn(k, b.dataset.def === '0' ? 0 : 1); saveSettings({ [k]: on ? '0' : '1' }); if (k === 'zoomDef' || b.dataset.redraw) draw(); else b.classList.toggle('on', !on); });
    P.b && P.b();
  };
  draw();
}
