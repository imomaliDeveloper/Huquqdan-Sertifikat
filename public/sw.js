const CACHE_NAME = 'huquq-sertifikat-v18';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/app.js',
  '/js/exam_data.js',
  '/js/flashcards.js',
  '/data/laws_list.json',
  '/data/textbooks.json',
  '/data/cases_bank.json',
  '/data/channels.json',
  '/data/tariffs.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Yangi versiya keshlanmoqda (v11)');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW keshida ayrim tashqi fayllar olinmadi:', err);
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('SW: Eski kesh o\'chirildi:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Faqat GET so'rovlar
  if (event.request.method !== 'GET') return;

  // API so'rovlari tarmoqqa
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: "Oflayn rejimdasiz" }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-First: Avval tarmoqdan eng yangisini olish, faqat oflayn bo'lsa keshdan berish
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
