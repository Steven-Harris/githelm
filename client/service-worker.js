import { showLogin } from "./modules/ui";

const CACHE_NAME = 'github-monitor-cache-v1';
const urlsToCache = [
  '/index.html',
  '/assets/style.css',
  '/main.js',
  '/assets/manifest.json',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(res => {
          if (res.status === 401) {
            showLogin();
            return null;
          }
          return res;
        });
      })
  );
});