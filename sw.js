// Bob service worker: phone / desktop push notifications only (no offline caching, so pages always load fresh).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Bob', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'bob-' + (d.screen || '') + '-' + (d.open || ''), data: d
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const d = e.notification.data || {};
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = all.find(x => x.url.includes('me.html')) || all[0];
    if (c) { await c.focus(); c.postMessage({ bobGoto: { screen: d.screen || '', open: d.open || '' } }); }
    else await self.clients.openWindow('me.html' + (d.screen ? '?goto=' + encodeURIComponent(d.screen + '|' + (d.open || '')) : ''));
  })());
});
