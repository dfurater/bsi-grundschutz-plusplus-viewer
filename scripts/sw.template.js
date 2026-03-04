const CACHE_VERSION = "__CACHE_VERSION__";
const CACHE_PREFIX = "grundschutzpp";
const HTML_CACHE = `${CACHE_PREFIX}-html-${CACHE_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}-data-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}-asset-${CACHE_VERSION}`;

const PRECACHE_HTML = ["./", "./index.html"];
const PRECACHE_DATA = ["./data/catalog-meta.json", "./data/catalog-index.json", "./data/build-info.json"];

function isCacheableBaseResponse(response) {
  return Boolean(response && response.ok && response.status === 200 && !response.redirected && response.type === "basic");
}

function isCacheableHtml(response) {
  if (!isCacheableBaseResponse(response)) {
    return false;
  }
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("text/html");
}

function isCacheableJson(response) {
  if (!isCacheableBaseResponse(response)) {
    return false;
  }
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json");
}

async function preCacheUrls(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (isCacheableBaseResponse(response)) {
          await cache.put(url, response.clone());
        }
      } catch {
        // Precache should not block installation when static host is partially unavailable.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.all([preCacheUrls(HTML_CACHE, PRECACHE_HTML), preCacheUrls(DATA_CACHE, PRECACHE_DATA)]));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          const keep = key === HTML_CACHE || key === DATA_CACHE || key === ASSET_CACHE;
          if (keep) {
            return Promise.resolve();
          }
          if (!key.startsWith(`${CACHE_PREFIX}-`)) {
            return Promise.resolve();
          }
          return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request, cacheName, matcher, fallbackResponse) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (matcher(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    if (fallbackResponse) {
      return fallbackResponse;
    }
    throw new Error("Network request failed");
  }
}

async function staleWhileRevalidate(request, cacheName, matcher) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (matcher(response)) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response("Network error", { status: 503, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  const isDataRequest = requestUrl.pathname.includes("/data/");
  const isAssetRequest = requestUrl.pathname.includes("/assets/");

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, HTML_CACHE, isCacheableHtml, new Response("Offline", { status: 503, statusText: "Offline" })).catch(
        async () => (await caches.match("./index.html")) || new Response("Offline", { status: 503, statusText: "Offline" })
      )
    );
    return;
  }

  if (isDataRequest) {
    event.respondWith(
      networkFirst(request, DATA_CACHE, isCacheableJson, new Response("Offline", { status: 503, statusText: "Offline" }))
    );
    return;
  }

  if (isAssetRequest) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE, isCacheableBaseResponse));
  }
});
