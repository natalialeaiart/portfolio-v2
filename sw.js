const CACHE_NAME = 'ai-video-portfolio-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/portfolio.html',
    '/pic.jpeg',
    'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600&display=swap'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Failed to cache resources:', error);
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
    // Кэшируем YouTube thumbnail изображения
    if (event.request.url.includes('img.youtube.com')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(event.request).then((response) => {
                        // Проверяем, что ответ валидный
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
                })
                .catch(() => {
                    // Возвращаем placeholder изображение при ошибке
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#69bbd6"/><text x="160" y="90" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Video Thumbnail</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                })
        );
        return;
    }
    
    // Для остальных запросов используем стратегию "сначала кэш, потом сеть"
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Возвращаем кэшированную версию или делаем сетевой запрос
                return response || fetch(event.request).then((response) => {
                    // Кэшируем только GET запросы и успешные ответы
                    if (event.request.method === 'GET' && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                });
            })
            .catch(() => {
                // Возвращаем офлайн страницу для HTML запросов
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Обработка сообщений от главного потока
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Предварительная загрузка критических ресурсов
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PRELOAD_THUMBNAILS') {
        const thumbnailUrls = event.data.urls;
        
        caches.open(CACHE_NAME).then((cache) => {
            thumbnailUrls.forEach((url) => {
                fetch(url).then((response) => {
                    if (response.ok) {
                        cache.put(url, response);
                    }
                }).catch((error) => {
                    console.log('Failed to preload thumbnail:', url, error);
                });
            });
        });
    }
});

