// Warehouse screens login (28 Oct): one shared company password, stays logged in until Friday 11pm.
// Inside the main dashboard the person's own login is used instead (same browser storage), so no password is needed there.
// Loaded in <head>, before the page's own scripts: it adds the login to every call to Bob's server, and shows the
// password screen whenever there's no login or the server says it's expired.
(function () {
  const ME = 'https://uppxdrihpxsygaorffro.supabase.co/functions/v1/me';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const del = k => { try { localStorage.removeItem(k); } catch (e) {} };
  // the old access-key links are retired: forget any saved key and tidy it out of the address bar
  del('tsd_key_wh');
  try { const p = new URLSearchParams(location.search); if (p.has('k')) { p.delete('k'); history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash); } } catch (e) {}
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const token = () => (inFrame ? get('tsd_me_token') : null) || get('tsd_wh_token') || get('tsd_me_token');

  let shown = false;
  function ungate() {
    if (!shown) return; shown = false;
    const d = document.getElementById('wh-gate'); if (d) d.remove();
  }
  function gate(msg) {
    if (shown) return; shown = true;
    if (inFrame) { try { window.top.postMessage({ tsd: 'login' }, '*'); } catch (e) {} }
    const draw = () => {
      const d = document.createElement('div');
      d.id = 'wh-gate';
      d.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;font-family:var(--body,Inter,Segoe UI,Arial,sans-serif)';
      const logo = document.querySelector('header img, img');
      d.innerHTML = `<form style="background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:26px 22px;width:100%;max-width:420px;display:flex;flex-direction:column;gap:14px;color:var(--ink)">
        <div style="display:flex;align-items:center;gap:11px;font-family:var(--num,'Inter Tight',Arial,sans-serif);font-weight:700;font-size:12.5px;letter-spacing:2.2px"><img src='data:image/png;base64,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' alt="" style="height:26px">TILING SUPPLIES DIRECT</div>
        <div style="font-family:var(--num,'Inter Tight',Arial,sans-serif);font-weight:700;font-size:24px;letter-spacing:-.3px;line-height:1.15">Warehouse screens</div>
        <div style="color:var(--muted);font-size:15px">${inFrame ? "You've been logged out. Log back in at the top of the page." : 'Enter the company password. This device then stays logged in until Friday night.'}</div>
        ${inFrame ? '' : `<input type="password" autocomplete="current-password" placeholder="Password" style="background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:14px;font-size:20px">
        <button type="submit" style="background:var(--accent);color:var(--on-accent);border:0;border-radius:10px;padding:14px;font-size:18px;font-weight:700;cursor:pointer">Log in</button>`}
        <div data-e style="color:var(--bad);font-size:15px;min-height:20px">${msg || ''}</div></form>`;
      document.body.appendChild(d);
      const f = d.querySelector('form'), i = d.querySelector('input'), e = d.querySelector('[data-e]');
      if (i) setTimeout(() => i.focus(), 50);
      f.onsubmit = async ev => {
        ev.preventDefault(); if (!i) return;
        e.textContent = 'Checking…';
        try {
          const r = await origFetch(ME, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'device_login', password: i.value }) });
          const j = await r.json();
          if (!j.ok) { e.textContent = j.error || 'Wrong password.'; i.select(); return; }
          set('tsd_wh_token', j.token); location.reload();
        } catch (x) { e.textContent = "Can't reach the system. Check the internet connection."; }
      };
    };
    if (document.body) draw(); else document.addEventListener('DOMContentLoaded', draw);
  }

  // every call to Bob's server carries the login; a 401 means it's expired, so show the password screen
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!/supabase\.co\/functions\/v1\/(warehouse|goods-in|stock|note)/.test(url)) return origFetch(input, init);
    const t = token();
    if (!t) { gate(); return new Response(JSON.stringify({ error: 'not logged in' }), { status: 401, headers: { 'Content-Type': 'application/json' } }); }
    init = Object.assign({}, init || {});
    init.headers = Object.assign({}, init.headers || {}, { Authorization: 'Bearer ' + t });
    const r = await origFetch(input, init);
    if (r.status === 401) { if (get('tsd_wh_token') === t) del('tsd_wh_token'); gate('Logged out. Enter the password again.'); }
    // a later call that succeeds (e.g. after logging in again at the top, or the server coming back) clears a stuck overlay
    else if (r.ok) ungate();
    return r;
  };
  if (!token()) gate();
  // 2 Nov: inside the main dashboard, logging in at the top only writes localStorage here - it doesn't otherwise
  // tell this screen about it, so it could sit on the gate forever even though the person is now logged in.
  // The browser fires a 'storage' event in every OTHER tab/frame sharing this login when it changes, so listen
  // for that and reload straight away rather than waiting for the next button press or refresh.
  if (inFrame) window.addEventListener('storage', e => { if (e.key === 'tsd_me_token' && e.newValue) location.reload(); });
  // a small "Lock" button on shared warehouse PCs, so the screen can be logged out (e.g. if a PC moves or someone leaves)
  if (!inFrame && get('tsd_wh_token')) {
    const addBtn = () => { const b = document.createElement('button'); b.textContent = 'Log out';
      b.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:1500;background:var(--panel);color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:7px 12px;font:600 13px Barlow,Segoe UI,Arial,sans-serif;cursor:pointer;opacity:.75';
      b.onclick = () => { if (confirm('Log this screen out? It will need the company password again.')) { del('tsd_wh_token'); location.reload(); } };
      document.body.appendChild(b); };
    if (document.body) addBtn(); else document.addEventListener('DOMContentLoaded', addBtn);
  }
  window.TSDWH = { logout() { del('tsd_wh_token'); location.reload(); } };
})();
