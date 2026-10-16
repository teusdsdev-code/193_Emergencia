/* Service Worker — CBMGO 193 */
const CACHE = 'cbmgo193-v2';
const ASSETS = [
  './',
  './index.html',
  './triagem.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Promise.all com catch individual: um CDN fora do ar não derruba o install
      Promise.all(ASSETS.map(url => c.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navegação: network-first; se falhar, tenta a página pedida; senão index.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => {
        const u = new URL(req.url);
        const page = u.pathname.split('/').pop() || 'index.html';
        return caches.match('./' + page).then(r => r || caches.match('./index.html'));
      })
    );
    return;
  }

  // Outros: cache-first, revalida em background
  e.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req).then(resp => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});