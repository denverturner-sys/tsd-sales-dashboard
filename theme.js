// System look (25 Nov 2026 redesign). Loaded in the <head> of every page, after the page's own <style>.
// Light is the default for everyone; each person picks Dark / Match my device and a highlight colour in Settings > Appearance.
// Pages keep their own CSS variable names (--bg, --panel, --ink, --accent ...); this just gives those variables the new values,
// so no page logic changes. Colour rule: neutrals do the work, ONE highlight colour (fills only, never text), ONE red for urgent.
(function () {
  var KEY = 'tsd_prefs';
  var ACCENTS = {
    yellow:   { c: '#EBCB2D', ink: '#1A1600' },
    stone:    { c: '#B9AE98', ink: '#1A1712' },
    sage:     { c: '#7E9C83', ink: '#0D1A10' },
    slate:    { c: '#5D7AA6', ink: '#FFFFFF' },
    clay:     { c: '#B86E4B', ink: '#FFFFFF' },
    graphite: { c: '#4A4D52', ink: '#FFFFFF' }
  };
  function prefs() {
    var p = { theme: 'light', accent: 'yellow', density: 'comfortable', text: 'normal', sideCollapsed: false, motion: true };
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) for (var k in s) p[k] = s[k]; } catch (e) {}
    // a screen opened with ?theme=dark (e.g. the office TV) keeps that look whatever the device's saved setting is
    try { var q = new URLSearchParams(location.search).get('theme'); if (q === 'dark' || q === 'light') p.theme = q; } catch (e) {}
    return p;
  }
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var LIGHT = '--bg:#F4F3EF;--panel:#FFFFFF;--panel2:#F6F5F1;--line:#E3E1DB;--ink:#151617;--muted:#6C6F73;' +
    '--good:#2F6B4A;--bad:#C2352B;--warn:#8A6200;--blue:#3B5B8C;--accent-text:#151617;' +
    '--tint-good:#EEF4EF;--tint-bad:#FBEDEB;--tint-warn:#F8F3E1;--tint-info:#EEF1F6;--hover:#F1F0EC;--shadow:0 1px 2px rgba(20,20,20,.05),0 1px 1px rgba(20,20,20,.03);';
  var DARK = '--bg:#0D0E0F;--panel:#151718;--panel2:#1C1E21;--line:#2A2D31;--ink:#F1F1EF;--muted:#9A9EA3;' +
    '--good:#8FC3A3;--bad:#FF6A5C;--warn:#E9C46A;--blue:#9DB6DD;--accent-text:#F1F1EF;' +
    '--tint-good:rgba(143,195,163,.12);--tint-bad:rgba(255,106,92,.12);--tint-warn:rgba(233,196,106,.12);--tint-info:rgba(157,182,221,.12);--hover:#1E2023;--shadow:0 1px 2px rgba(0,0,0,.4);';
  var FONTS = "--num:'Inter Tight','Inter','Segoe UI',Arial,sans-serif;--body:'Inter','Segoe UI',Arial,sans-serif;--mono:'JetBrains Mono',ui-monospace,Consolas,monospace;";

  function css(p) {
    var dark = p.theme === 'dark' || (p.theme === 'device' && mq && mq.matches);
    var a = ACCENTS[p.accent] || ACCENTS.yellow;
    return ':root:root{' + (dark ? DARK : LIGHT) + FONTS + '--accent:' + a.c + ';--on-accent:' + a.ink + ';color-scheme:' + (dark ? 'dark' : 'light') + '}' +
      'html,body{background:var(--bg);color:var(--ink)}' +
      'body{font-family:var(--body);-webkit-font-smoothing:antialiased}' +
      // headings and big numbers were Bebas (tall, condensed, spaced out); Inter Tight wants tight spacing instead
      '.num,.title,h1,h2{letter-spacing:-.3px}' +
      (p.text === 'large' ? 'body{zoom:1.07}' : '') +
      (p.motion === false ? '*{transition:none!important;animation:none!important}' : '') +
      'button{transition:border-color .15s,box-shadow .15s,background .15s}' +
      'input,select,textarea{color-scheme:' + (dark ? 'dark' : 'light') + '}';
  }
  function apply() {
    var p = prefs(), r = document.documentElement;
    var dark = p.theme === 'dark' || (p.theme === 'device' && mq && mq.matches);
    r.setAttribute('data-mode', dark ? 'dark' : 'light');
    r.setAttribute('data-density', p.density || 'comfortable');
    var st = document.getElementById('tsd-theme');
    if (!st) { st = document.createElement('style'); st.id = 'tsd-theme'; (document.head || r).appendChild(st); }
    st.textContent = css(p);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', dark ? '#08090A' : '#121314');
  }
  // fonts (one request, shared by every page)
  if (!document.getElementById('tsd-fonts')) {
    var l = document.createElement('link'); l.id = 'tsd-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap';
    (document.head || document.documentElement).appendChild(l);
  }
  apply();
  // a change in Settings (or another tab) re-themes every open page and frame straight away
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(); });
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (prefs().theme === 'device') apply(); });
  window.TSDTheme = { apply: apply, prefs: prefs, ACCENTS: ACCENTS, KEY: KEY,
    save: function (p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} apply();
      // frames on the same site don't get a storage event from their own parent page, so tell them directly
      try { var fr = document.querySelectorAll('iframe'); for (var i = 0; i < fr.length; i++) { try { fr[i].contentWindow.TSDTheme && fr[i].contentWindow.TSDTheme.apply(); } catch (x) {} } } catch (x) {} } };
})();
