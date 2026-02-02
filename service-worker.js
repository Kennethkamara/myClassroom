/**
 * Service Worker for CMT PWA
 * Handles caching and offline functionality
 * Updated to use network-first for Firebase and JS files
 */

const CACHE_NAME = 'cmt-v5-network-first'; // Updated version to force refresh
const STATIC_CACHE_NAME = 'cmt-static-v5';

// Static assets that can be cached (HTML, CSS, images)
const STATIC_ASSETS = [
    './',
    './index.html',
    './app.html',
    './login.html',
    './styles.css',
    './print-styles.css',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './logo-header.png',
    './logo.png'
];

// Install event - cache static resources only
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches
                    if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch event - network-first for JS/Firebase, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // NEVER cache Firebase, Firestore, or external APIs
    if (url.origin.includes('googleapis.com') || 
        url.origin.includes('gstatic.com') ||
        url.origin.includes('firebaseio.com') ||
        url.origin.includes('firebase') ||
        url.origin.includes('cdn.jsdelivr.net') ||
        url.origin.includes('cdnjs.cloudflare.com')) {
        // Network only - never cache Firebase or CDN resources
        event.respondWith(fetch(event.request));
        return;
    }
    
    // For JavaScript files (.js) - use network-first strategy
    if (event.request.url.endsWith('.js')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone the response
                    const responseToCache = response.clone();
                    // Update cache with new version
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // Network failed, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // For static assets (HTML, CSS, images) - use cache-first
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                // Not in cache, fetch from network
                return fetch(event.request).then((response) => {
                    // Don't cache if not a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    // Clone and cache
                    const responseToCache = response.clone();
                    caches.open(STATIC_CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
    );
});
