import {
     del,
     entries
} from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

const staticCacheName = 'site-static-v2';
const dynamicCacheName = 'site-dynamic-v1';
const assets = [
  '/',
  '/index.html',
  '/js/app.js',
  '/js/ui.js',
  '/js/materialize.min.js',
  '/css/styles.css',
  '/css/materialize.min.css',
  '/img/dish.png',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v47/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
  '/pages/fallback.html',
  '/pages/404.html'
];

// cache size limit function
const limitCacheSize = (name, size) => {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if(keys.length > size){
        cache.delete(keys[0]).then(limitCacheSize(name, size));
      }
    });
  });
};

// install event
self.addEventListener('install', evt => {
  console.log('service worker installed');
  evt.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      console.log('caching shell assets');
      cache.addAll(assets);
    })
  );
});

// activate event
self.addEventListener('activate', evt => {
  console.log('service worker activated');
  evt.waitUntil(
    caches.keys().then(keys => {
      //console.log(keys);
      return Promise.all(keys
        .filter(key => key !== staticCacheName && key !== dynamicCacheName)
        .map(key => caches.delete(key))
      );
    })
  );
});

// fetch event
self.addEventListener('fetch', evt => {
  console.log('fetch event', evt);
  evt.respondWith(
    caches.match(evt.request).then(cacheRes => {
      return cacheRes || fetch(evt.request).then(fetchRes => {
        return caches.open(dynamicCacheName).then(cache => {
          cache.put(evt.request.url, fetchRes.clone());
          // check cached items size
          limitCacheSize(dynamicCacheName, 15);
          return fetchRes;
        })
      });
    }).catch(() => {
      if(evt.request.url.indexOf('.html') > -1){
        return caches.match('/pages/fallback.html');
      } 
    })
  );
});

// sync event
self.addEventListener('sync', (evt) => {
    console.log('background synchronized', evt);
    if (evt.tag === 'sync-snaps') {
        evt.waitUntil(
            syncSnaps()
        );
    }
});

// sync function
let syncSnaps = async function () {
    entries()
        .then((entries) => {
            entries.forEach((entry) => {
                let snap = entry[1]; //  Each entry is an array of [key, value].
                let formData = new FormData();
                formData.append('id', snap.id);
                formData.append('ts', snap.ts);
                formData.append('title', snap.title);
                formData.append('image', snap.image, snap.id + '.png');
                fetch('/saveSnap', {
                        method: 'POST',
                        body: formData
                    })
                    .then((res) => {
                        if (res.ok) {
                            res.json()
                                .then((data) => {
                                    console.log("Deleting from idb:", data.id);
                                    del(data.id);
                                });
                        } else {
                            console.log(res);
                        }
                    })
                    .catch((error) => console.log(error));
            })
        });
}

// notification click
self.addEventListener("notificationclick", function (event) {
  let notification = event.notification;
  console.log("notification clicked", notification);
  event.waitUntil(
      clients.matchAll().then(function (clis) {
          clis.forEach((client) => {
              client.navigate(notification.data.redirectUrl);
              client.focus();
          });
          notification.close();
      })
  );
});

// notification close
self.addEventListener("notificationclose", function (event) {
  console.log("notification closed", event);
});

// push event
self.addEventListener("push", function (event) {
  console.log("push event", event);

  var data = { title: "title", body: "body", redirectUrl: "/" };

  if (event.data) {
      data = JSON.parse(event.data.text());
  }

  var options = {
      body: data.body,
      icon: "assets/img/android/android-launchericon-96-96.png",
      badge: "assets/img/android/android-launchericon-96-96.png",
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
          redirectUrl: data.redirectUrl,
      },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
