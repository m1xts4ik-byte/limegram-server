'use strict';
/* LimeGram — юзернеймы каналов и групп, проверка занятости, «Тип канала», ссылка-приглашение, удаление (грузится последним) */
function unameBind(root, inSel, stSel, chatId) {
  const inp = $(inSel, root), st = $(stSel, root); if (!inp || !st) return;
  let tm, seq = 0;
  const run = () => {
    clearTimeout(tm); const v = inp.value.trim().replace(/^@/, ''); st.className = 'un-st';
    if (!v) { st.textContent = ''; inp.dataset.ok = '1'; return; }
    if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v)) { st.textContent = 'Username: 4–32 символа, латиница, цифры и _, начинается с буквы'; st.classList.add('bad'); inp.dataset.ok = '0'; return; }
    st.textContent = 'Проверка…'; inp.dataset.ok = '0'; const my = ++seq;
    tm = setTimeout(async () => {
      try {
        const r = await api('/username/check?name=' + encodeURIComponent(v) + (chatId ? '&chatId=' + encodeURIComponent(chatId) : ''));
        if (my !== seq) return;
        st.textContent = r.ok ? '@' + v + ' свободен' : r.error; st.className = 'un-st ' + (r.ok ? 'ok' : 'bad'); inp.dataset.ok = r.ok ? '1' : '0';
      } catch { }
    }, 300);
  };
  inp.addEventListener('input', run); run();
}

async function inviteModal(c) {
  let r; try { r = await api('/chats/invite', { chatId: c.id }); } catch (er) { return fail(er); }
  const mb = modal(`<div class="mh"><h2>Ссылка-приглашение</h2><button class="ico" id="cx">${I.close}</button></div>
    <p class="mu2">Отправьте ссылку: по ней можно вступить в «${esc(c.title)}»</p><div class="linkbox" id="lk">${esc(r.link)}</div>
    <div class="mact"><button class="btn small" id="cp">Копировать</button>${r.username ? '' : '<button class="btn small ghost" id="rv">Сбросить ссылку</button>'}</div>`);
  $('#cx', mb).onclick = mb.close; $('#cp', mb).onclick = () => copyText($('#lk', mb).textContent);
  $('#rv', mb)?.addEventListener('click', async () => {
    if (!(await confirmBox('Старая ссылка перестанет работать. Сбросить?', 'Сбросить', true))) return;
    try { const n = await api('/chats/invite', { chatId: c.id, action: 'revoke' }); $('#lk', mb).textContent = n.link; toast('Создана новая ссылка'); } catch (er) { fail(er); }
  });
}

function typeModal(c0, parent) {
  const c = chat(c0.id) || c0; let pub = !!c.username;
  const mb = modal(''), m = $('.modal', mb); m.classList.add('tgs'); m._u = c.username || '';
  const kind = c.type === 'channel' ? 'канала' : 'группы';
  const draw = () => {
    m.innerHTML = `<div class="th"><h2>Тип ${kind}</h2></div><div class="tb"><div class="pg">
      <div class="grp0">${[[0, 'Частный', 'Вступить можно только по ссылке-приглашению'], [1, 'Публичный', 'Можно найти через поиск и вступить по постоянной ссылке']].map(([v, l, d]) => `<button class="sr rd" data-v="${v}"><span>${l}<small>${d}</small></span><i class="rdo ${!!v === pub ? 'on' : ''}"></i></button>`).join('')}</div>
      ${pub ? `<div class="sh">Постоянная ссылка</div><div class="unp"><span>limegram://u/</span><input id="tu" maxlength="32" autocomplete="off" value="${esc(m._u)}"></div><div class="un-st" id="tus" style="padding:6px 20px 0"></div><div class="hint">Можно использовать a–z, 0–9 и подчёркивание. Минимальная длина — 4 символа.</div>` : '<div class="hint">Для частного ' + (c.type === 'channel' ? 'канала' : 'чата') + ' доступна только ссылка-приглашение, её можно сбросить.</div>'}
    </div></div><div class="mfoot"><button id="tc">Отмена</button><button id="ts">Сохранить</button></div>`;
    $$('[data-v]', m).forEach(b => b.onclick = () => { pub = b.dataset.v === '1'; draw(); });
    $('#tc', m).onclick = mb.close;
    if (pub) { unameBind(m, '#tu', '#tus', c.id); $('#tu', m).addEventListener('input', e => m._u = e.target.value); $('#tu', m).focus(); }
    $('#ts', m).onclick = async () => {
      const un = pub ? $('#tu', m).value.trim().replace(/^@/, '') : '';
      if (pub && !un) return toast('Введите постоянную ссылку', true);
      if (pub && $('#tu', m).dataset.ok === '0') return toast($('#tus', m).textContent || 'Username недоступен', true);
      try { await api('/chats/edit', { chatId: c.id, username: un }); await loadChats(); mb.close(); parent && parent.close(); refreshInfo(c); toast(un ? 'Канал стал публичным' : 'Канал стал частным'); }
      catch (er) { const s = $('#tus', m); if (s) { s.textContent = er.message; s.className = 'un-st bad'; } else fail(er); }
    };
  };
  draw();
}

async function delChat(c, parent) {
  const what = c.type === 'channel' ? 'канал' : 'группу';
  if (!(await confirmBox('Удалить ' + what + ' «' + c.title + '» для всех участников? Все сообщения будут потеряны.', 'Удалить', true))) return;
  try { await api('/chats/delete', { chatId: c.id }); parent && parent.close(); S.active = null; S.info = false; $('#ip')?.remove(); await loadChats(); renderMain(); toast('Удалено'); } catch (er) { fail(er); }
}

const _editChat0 = editChatModal;
editChatModal = function (c) {
  const own = c.owner === S.me.id;
  const mb = modal(`<div class="mh"><h2>Изменить</h2><button class="ico" id="cx">${I.close}</button></div><label class="field">Название<input id="et" maxlength="64" value="${esc(c.title)}"></label><label class="field">Описание<textarea id="ea" rows="3" maxlength="200">${esc(c.about || '')}</textarea></label>
    ${own ? `<label class="field">Публичная ссылка (необязательно)<input id="eu" maxlength="32" placeholder="username" autocomplete="off" value="${esc(c.username || '')}"></label><div class="un-st" id="eus"></div>` : ''}<div class="err" id="ee"></div><button class="btn" id="es">Сохранить</button>`);
  $('#cx', mb).onclick = mb.close; if (own) unameBind(mb, '#eu', '#eus', c.id);
  $('#es', mb).onclick = async () => {
    const body = { chatId: c.id, title: $('#et', mb).value, about: $('#ea', mb).value }; if (own) body.username = $('#eu', mb).value;
    try { await api('/chats/edit', body); mb.close(); await loadChats(); } catch (er) { $('#ee', mb).textContent = er.message; }
  };
};
