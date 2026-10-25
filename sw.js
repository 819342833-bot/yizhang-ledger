/* 衣账 离线缓存
   注意：每次更新 index.html，必须把 CACHE 的版本号 +1，
   否则老设备会一直打到旧缓存、看不到新版本。 */
var CACHE = "yizhang-v11";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // 逐个缓存：任何一个失败都不影响其他资源（用 addAll 会整体失败）
    return Promise.all(ASSETS.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // 只处理本站资源，第三方 CDN（Excel 库）走网络
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(function () {
      return caches.match("./index.html").then(function (r) {
        return r || caches.match("./");
      });
    }));
    return;
  }

  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return caches.match("./index.html"); });
  }));
});
