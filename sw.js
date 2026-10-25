// Offline support, as in the Planner app. App files are fetched fresh when
// online (falling back to the saved copy after a short wait, or when offline),
// so updates show up on the next open. The Firebase library files have their
// version in the URL and are served from the saved copy. Google Fonts are
// saved the first time they load, so the fonts also work offline.

const CACHE = 'usbringup-v3';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/backup.js',
  'js/cloud.js',
  'js/config.js',
  'js/designs.js',
  'js/guide.js',
  'js/judge.js',
  'js/main.js',
  'js/protocols.js',
  'js/records.js',
  'js/settings.js',
  'js/steps.js',
  'js/store.js',
  'js/theme-boot.js',
  'js/util.js',
  'js/version.js',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];
const SLOW_NETWORK_MS = 2500;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  // Fresh copies, not the browser's HTTP cache: a new main.js with an old
  // records.js would break the module imports.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) e.respondWith(networkFirst(req));
  else if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) e.respondWith(cacheFirst(req));
  else if (FONT_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const network = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  const saved = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await cache.match('./') : undefined);
  if (!saved) return network;
  const slow = new Promise((resolve) => setTimeout(() => resolve(saved), SLOW_NETWORK_MS));
  return Promise.race([network.catch(() => saved), slow]);
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  // Font files come back opaque (status 0) without CORS; those are kept too.
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
