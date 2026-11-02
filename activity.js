// Activity log (2 Nov, Denver): records which screens people open, what they click, and every change they send to
// Bob's server (fulfilling an order, booking in a PO, ticking a task...) with whether it worked. Shown to admins on
// Management > Activity log. Loaded by every page with a login, after auth.js / wh-auth.js.
// Never records anything typed, PINs, passwords or login tokens, and ignores the login screens entirely.
// The server works out WHO from the login itself, so a page can't log something under someone else's name.
(function () {
  if (window.TSDLog) return;
  const API = 'https://uppxdrihpxsygaorffro.supabase.co/functions/v1/activity';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  // the same login the page itself uses: warehouse screens on their own (a shared PC) use the shared login first
  const whPage = !!document.querySelector('script[src*="wh-auth.js"]');
  const token = () => whPage && !inFrame ? (get('tsd_wh_token') || get('tsd_me_token')) : (get('tsd_me_token') || (whPage ? get('tsd_wh_token') : null));

  const P = new URLSearchParams(location.search);
  const page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  function screen() {
    if (window.TSD_SCREEN) return window.TSD_SCREEN;
    if (page === 'warehouse' && P.get('tab') === 'collections') return (P.get('loc') === 'wb' ? 'WB ' : '') + 'Collections';
    if (page === 'manage') return { tasks: 'Team tasks', activity: 'Activity log' }[P.get('tab')] || 'Users & access';
    if (page === 'purchasing' && P.get('open') === 'backorders') return 'Backorders';
    if (page === 'me') return 'Bob';
    return (document.title.split(' · ')[0] || page).trim();
  }

  const orig = window.fetch.bind(window);
  const q = [];
  let timer = null;
  function push(e, tk) {
    e.t = new Date().toISOString();
    if (!e.screen) e.screen = screen();
    e._tk = tk || token();
    q.push(e);
    if (q.length > 300) q.splice(0, q.length - 300);
    clearTimeout(timer); timer = setTimeout(flush, 4000);
  }
  function flush(leaving) {
    if (!q.length) return;
    const tk = q[0]._tk || token();
    if (!tk) return;                                  // not logged in yet: keep them until there's a login
    const batch = [];
    while (q.length && batch.length < 40 && (q[0]._tk || tk) === tk) { const e = q.shift(); delete e._tk; batch.push(e); }
    orig(API, { method: 'POST', keepalive: !!leaving, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ events: batch }) }).catch(() => {});
    if (q.length) setTimeout(() => flush(leaving), leaving ? 0 : 800);
  }
  addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });

  // ---- changes: every POST to Bob's server, and whether it worked ----
  const SECRET = /pin|pass|token|secret|key|^k$|^old$|^new$/i;   // set_pin sends old/new
  const SKIP = new Set(['login_name', 'login', 'device_login', 'admin_list']);   // logins are recorded by the server itself
  function clean(b) {
    const o = {}; let n = 0;
    for (const [k, v] of Object.entries(b || {})) {
      if (k === 'action' || SECRET.test(k) || v == null || v === '') continue;
      if (++n > 14) break;
      if (Array.isArray(v)) o[k] = v.length + (v.length === 1 ? ' item' : ' items');
      else if (typeof v === 'object') o[k] = '…';
      else o[k] = typeof v === 'string' ? v.slice(0, 120) : v;
    }
    return o;
  }
  window.fetch = function (input, init) {
    const p = orig(input, init);
    try {
      const url = typeof input === 'string' ? input : input.url;
      const m = url.match(/supabase\.co\/functions\/v1\/([a-z0-9-]+)/);
      const method = String((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
      if (m && method === 'POST' && m[1] !== 'activity') {
        let body = {}; try { body = JSON.parse((init && init.body) || '{}'); } catch (e) {}
        if (!SKIP.has(body.action)) {
          const ev = { kind: 'change', fn: m[1], action: String(body.action || 'save').slice(0, 40), detail: clean(body) };
          const tk = token();
          p.then(r => r.clone().json().catch(() => ({})).then(j => {
            ev.ok = r.ok && j.ok !== false && !j.error;
            if (!ev.ok) ev.err = String(j.error || ('HTTP ' + r.status)).slice(0, 160);
            push(ev, tk);
          }), () => { ev.ok = false; ev.err = 'No connection'; push(ev, tk); }).catch(() => {});
        }
      }
    } catch (e) {}
    return p;
  };

  // ---- clicks: buttons, links and tick boxes (never inside the login screens) ----
  const REF = /\b(SO|PO|QU|CR)-\d{3,}\b/;
  document.addEventListener('click', e => {
    try {
      const el = e.target.closest && e.target.closest('button, a, summary, [role=button], input[type=checkbox], input[type=radio], [data-tab]');
      if (!el || el.closest('#login, #wh-gate, .ta-modal, .ta, #tabs, #subtabs')) return;
      if (screen() === 'Activity log') return;          // don't log admins reading the log itself
      let label = el.matches('input') ? (el.getAttribute('aria-label') || el.closest('label')?.innerText || 'tick box') + (el.checked ? ' (ticked)' : ' (unticked)')
        : (el.getAttribute('aria-label') || el.innerText || el.title || '');
      label = String(label).replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!label || /^\d{1,2}$/.test(label)) return;
      let ref = '';
      for (let n = el, i = 0; n && i < 8 && !ref; n = n.parentElement, i++) { const mm = (n.innerText || '').slice(0, 1500).match(REF); if (mm) ref = mm[0]; }
      push({ kind: 'click', action: label, ref });
    } catch (x) {}
  }, true);

  // ---- screens opened: standalone pages on load; inside Bob the main page reports each tab it opens ----
  // (wait for the page's <title>: warehouse screens load this script before it)
  const opened = () => { if (!inFrame && page !== 'me') push({ kind: 'view', action: 'Opened ' + screen() }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', opened); else opened();
  window.TSDLog = {
    view(name) { push({ kind: 'view', screen: name, action: 'Opened ' + name }); },
    flush,
  };
})();
