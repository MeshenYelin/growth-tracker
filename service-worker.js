// Service Worker for 嘉韩 · 成长记录 PWA
// 缓存策略：Cache First for static assets, Network First for HTML

const CACHE_NAME = 'growth-tracker-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install event: precache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先策略
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果缓存中有，直接返回
        if (cachedResponse) {
          // 后台更新缓存（stale-while-revalidate）
          fetchAndCache(event.request);
          return cachedResponse;
        }

        // 没有缓存，从网络获取
        return fetchAndCache(event.request)
          .catch(() => {
            // 离线且没缓存时，返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 辅助函数：从网络获取并缓存
function fetchAndCache(request) {
  return fetch(request)
    .then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const responseClone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(request, responseClone);
          });
      }
      return response;
    });
}

// 监听消息：用于手动更新 SW
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker 已加载 - 版本:', CACHE_NAME);
