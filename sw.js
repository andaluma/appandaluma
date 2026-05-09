// ── ANDALUMA SERVICE WORKER ──────────────────────────────
// Strategy: network-first for everything, cache as offline fallback.
// Bump CACHE_NAME on every deploy so the activate handler wipes old caches
// and Android stops serving stale HTML from its HTTP cache.

var CACHE_NAME = 'andaluma-v20260509';

// Install: skip waiting so the new SW activates immediately
self.addEventListener('install', function(e){
  e.waitUntil(self.skipWaiting());
});

// Activate: delete all old caches, then claim all open clients immediately
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// Fetch: try the network first; on failure serve from cache
self.addEventListener('fetch', function(e){
  // Only handle GET requests for our own origin
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(resp){
      // Cache a copy of every successful response
      if(resp && resp.status === 200){
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, copy); });
      }
      return resp;
    }).catch(function(){
      // Offline fallback: serve from cache
      return caches.match(e.request).then(function(cached){
        return cached || new Response('App is offline', {status: 503, headers:{'Content-Type':'text/plain'}});
      });
    })
  );
});
