// Bob logins (28 Oct): tap your name, type your 4-digit PIN. Everyone's logged out at 2am.
// Used by every page with a personal login. The page calls TSDAuth.mount(onLogin) once; the page's own showLogin()
// just shows the #login box, and this fills it. Inside the main dashboard (an iframe) it hands logging in to the top page.
(function () {
  const ME = 'https://uppxdrihpxsygaorffro.supabase.co/functions/v1/me';
  const mem = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] || null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
  };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  const css = `
  .ta{width:100%;max-width:560px;background:var(--panel);border-radius:16px;padding:24px 22px;display:flex;flex-direction:column;gap:14px;color:var(--ink);font-family:var(--body,Inter,'Segoe UI',Arial,sans-serif);border:1px solid var(--line);box-shadow:0 10px 40px rgba(0,0,0,.08)}
  .ta .ta-top{display:flex;align-items:center;gap:14px}
  .ta .ta-top img{height:46px}
  .ta h1{margin:0;font-family:var(--num,'Inter Tight',Arial,sans-serif);font-weight:700;font-size:24px;letter-spacing:-.3px;line-height:1.15}
  .ta .ta-brand{display:flex;align-items:center;gap:11px;font-family:var(--num,'Inter Tight',Arial,sans-serif);font-weight:700;font-size:12.5px;letter-spacing:2.2px}
  .ta .ta-brand img{height:26px!important;align-self:center!important}
  #login .ta .ta-names button{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:15px 10px;font-size:16.5px;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  #login .ta .ta-names button:hover,#login .ta .ta-names button:focus{border-color:var(--ink);outline:none}
  #login .ta .ta-names button.last{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
  #login .ta .ta-pad button{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:16px 0;font-size:24px;font-weight:600}
  #login .ta .ta-pad button:active{background:var(--accent);color:var(--on-accent)}
  #login .ta .ta-pad button.s{font-size:15px;color:var(--muted)}
  #login .ta .ta-link{background:none;border:0;color:var(--muted);padding:0;font-size:14px;text-decoration:underline}
  .ta .ta-closed{background:var(--tint-bad,rgba(255,106,92,.12));color:var(--bad);border-radius:10px;padding:10px 12px;font-weight:600;font-size:14.5px;line-height:1.4}
  .ta .ta-sub{color:var(--muted);font-size:14px}
  .ta .ta-names{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
  .ta .ta-names button{background:var(--panel2);color:var(--ink);border:2px solid var(--line);border-radius:12px;padding:16px 10px;font-size:18px;font-weight:700;cursor:pointer;font-family:inherit}
  .ta .ta-names button:hover,.ta .ta-names button:focus{border-color:var(--accent);outline:none}
  .ta .ta-names button.last{border-color:var(--accent)}
  .ta .ta-dots{display:flex;gap:14px;justify-content:center;margin:6px 0}
  .ta .ta-dots span{width:18px;height:18px;border-radius:50%;border:2px solid var(--muted)}
  .ta .ta-dots span.on{background:var(--accent);border-color:var(--accent)}
  .ta .ta-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:330px;margin:0 auto;width:100%}
  .ta .ta-pad button{background:var(--panel2);color:var(--ink);border:0;border-radius:12px;padding:18px 0;font-size:26px;font-weight:700;cursor:pointer;font-family:inherit}
  .ta .ta-pad button:active{background:var(--accent);color:var(--on-accent)}
  .ta .ta-pad button.s{font-size:16px;color:var(--muted)}
  .ta .ta-err{color:var(--bad);font-size:15px;min-height:20px;text-align:center}
  .ta .ta-link{background:none;border:0;color:var(--blue);cursor:pointer;font-size:14px;font-family:inherit;padding:0;align-self:center}
  .ta .ta-who{font-size:22px;font-weight:700;text-align:center}
  .ta-modal{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;z-index:1000}
  .ta table{width:100%;border-collapse:collapse;font-size:15px}
  .ta td{padding:8px 4px;border-bottom:1px solid var(--line)}
  .ta .ta-btn{background:transparent;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
  .ta .ta-btn.go{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
  .ta .ta-tag{font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;margin-left:6px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  async function post(body, token) {
    const r = await fetch(ME, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) });
    return r.json().catch(() => ({ ok: false, error: 'Server error' }));
  }
  const logoSrc = () => { const i = document.querySelector('#login img, header img'); return i ? i.src : ''; };

  // a PIN pad; resolves digits one at a time into a 4-digit string
  function pad(el, title, sub, onPin, onBack) {
    let pin = '';
    el.innerHTML = `<div class="ta-who">${title}</div>${sub ? `<div class="ta-sub" style="text-align:center">${sub}</div>` : ''}
      <div class="ta-dots">${'<span></span>'.repeat(4)}</div><div class="ta-err" data-err></div>
      <div class="ta-pad">${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" data-d="${n}">${n}</button>`).join('')}
        <button type="button" class="s" data-back>${onBack ? 'Back' : ''}</button><button type="button" data-d="0">0</button><button type="button" class="s" data-del>⌫</button></div>`;
    const dots = [...el.querySelectorAll('.ta-dots span')];
    const show = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const err = el.querySelector('[data-err]');
    const press = async d => {
      if (pin.length >= 4) return;
      pin += d; show();
      if (pin.length === 4) { const p = pin; const msg = await onPin(p); if (msg) { err.textContent = msg; pin = ''; show(); } }
    };
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => press(b.dataset.d));
    el.querySelector('[data-del]').onclick = () => { pin = pin.slice(0, -1); show(); };
    el.querySelector('[data-back]').onclick = () => onBack && onBack();
    const key = e => { if (!el.isConnected) return document.removeEventListener('keydown', key);
      if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') { pin = pin.slice(0, -1); show(); } else if (e.key === 'Escape' && onBack) onBack(); };
    document.addEventListener('keydown', key);
    return { error: m => { err.textContent = m; } };
  }

  // change PIN: current, new, new again. forced = must change after an admin reset
  function changePin(token, forced, done) {
    const m = document.createElement('div'); m.className = 'ta-modal';
    m.innerHTML = `<div class="ta"><div class="ta-top"><h1>${forced ? 'Set your own PIN' : 'Change PIN'}</h1></div>
      ${forced ? '<div class="ta-sub">You logged in with a temporary PIN. Pick your own 4 digits now. Avoid easy ones like 1234, 0000, 1111 or a year.</div>' : ''}
      <div data-p></div>${forced ? '' : '<button class="ta-link" data-x>Cancel</button>'}</div>`;
    document.body.appendChild(m);
    const el = m.querySelector('[data-p]');
    const close = () => m.remove();
    if (!forced) m.querySelector('[data-x]').onclick = close;
    let oldPin = '', newPin = '';
    const step1 = () => pad(el, 'Current PIN', '', async p => { oldPin = p; step2(); });
    const step2 = () => pad(el, 'New PIN', '4 digits, not easy to guess', async p => { newPin = p; step3(); }, step1);
    const step3 = () => pad(el, 'New PIN again', '', async p => {
      if (p !== newPin) { step2(); setTimeout(() => { const e = el.querySelector('[data-err]'); if (e) e.textContent = "Those didn't match. Try again."; }, 0); return; }
      const j = await post({ action: 'set_pin', old: oldPin, new: newPin }, token);
      if (!j.ok) { step1(); setTimeout(() => { const e = el.querySelector('[data-err]'); if (e) e.textContent = j.error || "Couldn't change it"; }, 0); return; }
      close(); alertBox('PIN changed. Use your new PIN from now on.'); done && done();
    }, step2);
    step1();
  }
  function alertBox(text) {
    const m = document.createElement('div'); m.className = 'ta-modal';
    m.innerHTML = `<div class="ta"><div style="font-size:17px;line-height:1.5">${text}</div><button class="ta-btn go" style="align-self:flex-end;padding:10px 18px">OK</button></div>`;
    document.body.appendChild(m); m.querySelector('button').onclick = () => m.remove();
  }

  // admins: see who's locked / waiting to set a PIN, reset a PIN to a temporary one, unlock
  async function adminPins(token) {
    const m = document.createElement('div'); m.className = 'ta-modal';
    m.innerHTML = `<div class="ta" style="max-width:640px"><div class="ta-top"><h1>Manage PINs</h1></div><div data-b class="ta-sub">Loading…</div><button class="ta-link" data-x>Close</button></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-x]').onclick = () => m.remove();
    const body = m.querySelector('[data-b]');
    const draw = async () => {
      const j = await post({ action: 'admin_list' }, token);
      if (!j.ok) { body.textContent = j.error || 'Admins only.'; return; }
      body.className = '';
      body.innerHTML = `<div class="ta-sub" style="margin-bottom:8px">Reset gives the person a one-off temporary PIN to read out to them. They pick their own the moment they log in.</div>
        <table>${j.staff.map(s => `<tr><td><b>${esc(s.name)}</b>${s.locked ? '<span class="ta-tag" style="background:var(--bad);color:var(--on-accent)">Locked</span>' : ''}${s.must_change ? '<span class="ta-tag" style="border:1px solid var(--accent);color:var(--accent-text)">Temp PIN</span>' : ''}${!s.has_pin ? '<span class="ta-tag" style="border:1px solid var(--muted);color:var(--muted)">No PIN</span>' : ''}</td>
          <td style="text-align:right;white-space:nowrap">${s.locked ? `<button class="ta-btn" data-u="${esc(s.name)}">Unlock</button> ` : ''}<button class="ta-btn" data-r="${esc(s.name)}">Reset PIN</button></td></tr>`).join('')}</table>`;
      body.querySelectorAll('[data-u]').forEach(b => b.onclick = async () => { const r = await post({ action: 'admin_pin', name: b.dataset.u, what: 'unlock' }, token); if (!r.ok) alertBox(esc(r.error)); draw(); });
      body.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => {
        if (!confirmBox) return;
        const r = await post({ action: 'admin_pin', name: b.dataset.r, what: 'reset' }, token);
        if (!r.ok) { alertBox(esc(r.error)); return; }
        alertBox(`${esc(b.dataset.r)}'s temporary PIN is <b style="font-size:28px;letter-spacing:4px">${r.temp_pin}</b><br>Tell them in person. They'll set their own as soon as they log in, and any device they were logged in on has been logged out.`);
        draw();
      });
    };
    const confirmBox = true;
    draw();
  }

  function mount(onLogin) {
    const box = document.getElementById('login');
    if (!box) return;
    if (inFrame) {
      // inside the main dashboard: the top page owns logging in
      box.innerHTML = `<div class="ta"><div class="ta-sub" style="font-size:16px">You've been logged out. Log back in at the top of the page.</div><div id="lerr" class="ta-err"></div><div id="err" class="ta-err"></div></div>`;
      new MutationObserver(() => { if (box.style.display && box.style.display !== 'none') try { window.top.postMessage({ tsd: 'login' }, '*'); } catch (e) {} })
        .observe(box, { attributes: true, attributeFilter: ['style'] });
      return;
    }
    const logo = logoSrc();
    let names = null;
    const ICON = 'data:image/png;base64,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';
    const shell = inner => `<div class="ta"><div class="ta-brand"><img src="${ICON}" alt="">TILING SUPPLIES DIRECT</div><h1>Log in</h1><div data-closed></div>${inner}</div>`;
    // 25 Nov: while the system is closed for an update, say so before anyone tries their PIN (admins can still log in)
    const closedNote = () => fetch(ME + '?status=1', { cache: 'no-store' }).then(r => r.json()).then(j => { const c = box.querySelector('[data-closed]');
      if (c && j && j.closed) c.innerHTML = `<div class="ta-closed">${esc(j.message || 'The system is closed while we update it. Please try again shortly.')}<br><span style="font-weight:400;font-size:13px">Admins can still log in.</span></div>`; }).catch(() => {});
    const showNames = msg => {
      box.innerHTML = shell(`<div class="ta-sub">Tap your name</div><div class="ta-names" data-n>${names ? '' : '<span class="ta-sub">Loading…</span>'}</div>
        <div id="lerr" class="ta-err">${esc(msg || '')}</div><div id="err" class="ta-err"></div>`);
      const g = box.querySelector('[data-n]'); closedNote();
      const last = store.get('tsd_last_name');
      const fill = () => { g.innerHTML = names.map(n => `<button type="button" class="${n === last ? 'last' : ''}" data-name="${esc(n)}">${esc(n)}</button>`).join('');
        g.querySelectorAll('[data-name]').forEach(b => b.onclick = () => showPad(b.dataset.name)); };
      if (names) fill();
      else fetch(ME + '?names=1', { cache: 'no-store' }).then(r => r.json()).then(j => { names = j.names || []; fill(); })
        .catch(() => { g.innerHTML = '<span class="ta-err">Can\'t reach the system. Check the internet connection.</span>'; });
    };
    const showPad = name => {
      box.innerHTML = shell('<div data-p></div><div id="lerr" class="ta-err"></div><div id="err" class="ta-err"></div>');
      pad(box.querySelector('[data-p]'), esc(name), 'Enter your PIN', async pin => {
        let j;
        try { j = await post({ action: 'login_name', name, pin }); } catch (e) { return "Can't reach the system. Check the internet connection."; }
        if (!j.ok) return j.error || 'Wrong PIN';
        store.set('tsd_me_token', j.token); store.set('tsd_last_name', name);
        const go = () => { showNames(); onLogin(j.token, j); };
        if (j.must_change) changePin(j.token, true, go); else go();
        return null;
      }, () => showNames());
    };
    showNames();
    // the page's own showLogin(msg) writes into #lerr/#err; start again from the names when the box is shown
    new MutationObserver(() => { if (box.style.display && box.style.display !== 'none' && !box.querySelector('[data-n]')) showNames(); })
      .observe(box, { attributes: true, attributeFilter: ['style'] });
  }

  window.TSDAuth = {
    mount,
    changePin: () => changePin(store.get('tsd_me_token'), false),
    adminPins: () => adminPins(store.get('tsd_me_token')),
    logout: async () => { const t = store.get('tsd_me_token'); try { await post({ action: 'logout', token: t }); } catch (e) {} store.del('tsd_me_token'); },
  };
})();
