/* شهاب — Service Worker (Phase 3).

   Hand-written, no Workbox: the shell is small and the build is static.

     shell      the chrome every page needs, precached at install
     pages      network-first with a 4s budget, then cache, then offline.html
     assets     stale-while-revalidate for same-origin css/js/fonts/images/svg
     never      /api/* (the SSE channel and the stubs), video / HLS segments,
                cross-origin requests (placeholder images from Wikimedia)

   Push: shows the notification the server sends (or js/push.js triggers
   locally) and opens its url on click. Update flow: the page posts
   SKIP_WAITING when the reader accepts the new version. */
'use strict';
var VERSION = 'sh-284';
var SHELL = [
  'index.html', 'offline.html', 'manifest.webmanifest',
  'css/fonts.css', 'css/transition.css', 'css/tokens.css', 'css/base.css', 'css/header.css', 'css/widgets.css',
  'css/footer.css', 'css/components.css', 'css/chrome.css', 'css/feed.css', 'css/mark.css', 'css/responsive.css',
  'css/brief.css', 'css/ltr.css', 'css/pages/index.css',
  'js/ui.js', 'js/lang.js', 'js/i18n-en.js', 'js/chrome.js', 'js/feed.js', 'js/app.js', 'js/responsive.js', 'js/widgets.js', 'js/livebox.js', 'js/brief.js',
  'js/push.js', 'js/searchbox.js',
  'assets/images/icons.svg', 'assets/images/logo-white.png', 'assets/images/favicon.svg', 'assets/images/icon-192.png',
  'assets/images/mark-sheen.svg', 'assets/images/mark-arrow.svg',
  'assets/fonts/neue-helvetica-arabic-400.woff2', 'assets/fonts/neue-helvetica-arabic-700.woff2'
];
var NEVER = /\/api\/|\.(m3u8|m4s|ts|mp4|webm|vtt)(\?|$)/;
var ASSET = /\.(css|js|woff2|png|jpg|jpeg|webp|svg|json|geojson|webmanifest)(\?|$)/;
/* on localhost every asset is network-first so edits show up without a
   version bump; production keeps stale-while-revalidate for speed */
var DEV = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (cache) {
    return Promise.all(SHELL.map(function (url) {
      return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});   // one missing file must not block install
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    promise.then(function (v) { clearTimeout(t); resolve(v); }, function (err) { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin || NEVER.test(url.pathname + url.search)) return;

  var isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') === 0;
  if (isPage) {
    e.respondWith(
      withTimeout(fetch(req), 4000).then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match('offline.html');
        });
      })
    );
    return;
  }
  if (ASSET.test(url.pathname)) {
    e.respondWith(caches.open(VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        var refresh = fetch(req).then(function (res) {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return DEV ? refresh : (hit || refresh);
      });
    }));
  }
});

/* ---- push ---- */
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'عاجل | شهاب', {
    body: d.body || d.t || '',
    icon: 'assets/images/icon-192.png',
    badge: 'assets/images/icon-192.png',
    dir: 'rtl', lang: 'ar', tag: d.tag || 'sh-breaking', renotify: true,
    data: { url: d.url || d.href || 'coverage.html' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || 'index.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url === url && 'focus' in list[i]) return list[i].focus();
    }
    return self.clients.openWindow(url);
  }));
});
