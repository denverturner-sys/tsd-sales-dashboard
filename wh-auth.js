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
  function gate(msg) {
    if (shown) return; shown = true;
    if (inFrame) { try { window.top.postMessage({ tsd: 'login' }, '*'); } catch (e) {} }
    const draw = () => {
      const d = document.createElement('div');
      d.id = 'wh-gate';
      d.style.cssText = 'position:fixed;inset:0;background:#262727;z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Barlow,Segoe UI,Arial,sans-serif';
      const logo = document.querySelector('header img, img');
      d.innerHTML = `<form style="background:#323333;border-radius:16px;padding:26px 22px;width:100%;max-width:420px;display:flex;flex-direction:column;gap:14px;color:#fff">
        ${logo ? `<img src="${logo.src}" alt="TSD" style="height:46px;align-self:flex-start">` : ''}
        <div style="font-family:'Bebas Neue','Arial Narrow',Arial,sans-serif;font-size:34px;letter-spacing:1px;line-height:1">Warehouse screens</div>
        <div style="color:#B9BCBC;font-size:15px">${inFrame ? "You've been logged out. Log back in at the top of Bob." : 'Enter the company password. This device then stays logged in until Friday night.'}</div>
        ${inFrame ? '' : `<input type="password" autocomplete="current-password" placeholder="Password" style="background:#262727;color:#fff;border:1px solid #474949;border-radius:10px;padding:14px;font-size:20px">
        <button type="submit" style="background:#EED107;color:#262727;border:0;border-radius:10px;padding:14px;font-size:18px;font-weight:700;cursor:pointer">Log in</button>`}
        <div data-e style="color:#FF7A6B;font-size:15px;min-height:20px">${msg || ''}</div></form>`;
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
        } catch (x) { e.textContent = "Can't reach Bob. Check the internet connection."; }
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
    return r;
  };
  if (!token()) gate();
  // a small "Lock" button on shared warehouse PCs, so the screen can be logged out (e.g. if a PC moves or someone leaves)
  if (!inFrame && get('tsd_wh_token')) {
    const addBtn = () => { const b = document.createElement('button'); b.textContent = '🔒 Log out';
      b.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:1500;background:#323333;color:#B9BCBC;border:1px solid #474949;border-radius:999px;padding:7px 12px;font:600 13px Barlow,Segoe UI,Arial,sans-serif;cursor:pointer;opacity:.75';
      b.onclick = () => { if (confirm('Log this screen out? It will need the company password again.')) { del('tsd_wh_token'); location.reload(); } };
      document.body.appendChild(b); };
    if (document.body) addBtn(); else document.addEventListener('DOMContentLoaded', addBtn);
  }
  window.TSDWH = { logout() { del('tsd_wh_token'); location.reload(); } };
})();
