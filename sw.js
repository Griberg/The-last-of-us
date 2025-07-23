const GHPATH = '/Griberg';

// Add a new version here if you updated your files so
// the last version will be used
const VERSIONS = ['v1'];

const LAST_VERSION = VERSIONS.at(-1);

const addResourcesToCache = async (resources) => {
  const cache = await caches.open(LAST_VERSION);
  await cache.addAll(resources);
};

const putInCache = async (request, response) => {
  const cache = await caches.open(LAST_VERSION);
  await cache.put(request, response);
};

const cacheFirst = async ({
  request,
  preloadResponsePromise,
  event,
}) => {
  // First try to get the resource from the cache
  const responseFromCache = await caches.match(request);

  if (responseFromCache) {
    return responseFromCache;
  }

  // Next try to use (and cache) the preloaded response, if it's there
  const preloadResponse = await preloadResponsePromise;

  if (preloadResponse) {
    event.waitUntil(putInCache(request, preloadResponse.clone()));
    return preloadResponse;
  }

  // Next try to get the resource from the network
  try {
    const responseFromNetwork = await fetch(request);
    // response may be used only once
    // we need to save clone to put one copy in cache
    // and serve second one
    event.waitUntil(putInCache(request, responseFromNetwork.clone()));
    return responseFromNetwork;
  } catch (error) {
    // We don't use fallbacks

    return new Response("Network error happened", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

// Enable navigation preload
const enableNavigationPreload = async () => {
  if (self.registration.navigationPreload) {
    await self.registration.navigationPreload.enable();
  }
};

self.addEventListener("activate", event => {
  event.waitUntil(enableNavigationPreload());
});

self.addEventListener("install", event => {
  event.waitUntil(
    addResourcesToCache([
      `${GHPATH}/`,
      `${GHPATH}/index.html`,
      `${GHPATH}/login.html`,
      `${GHPATH}/register.html`,
      `${GHPATH}/section.html`,
      `${GHPATH}/static/`,
      `${GHPATH}/static/style.css`,
      `${GHPATH}/static/icons/`,
      `${GHPATH}/static/icons/android-chrome-192x192.png`,
      `${GHPATH}/static/icons/android-chrome-512x512.png`,
      `${GHPATH}/static/icons/apple-touch-icon.png`,
      `${GHPATH}/static/icons/favicon-16x16.png`,
      `${GHPATH}/static/icons/favicon-32x32.png`,
      `${GHPATH}/static/icons/favicon.ico`,
      `${GHPATH}/static/images/logo.svg`
    ]),
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    cacheFirst({
      request: event.request,
      preloadResponsePromise: event.preloadResponse,
      event,
    }),
  );
});

// Deleting old cache

const deleteCache = async key => {
  await caches.delete(key);
};

const deleteOldCaches = async () => {
  const keyList = await caches.keys();
  const cachesToDelete = keyList.filter(key => LAST_VERSION != key);
  await Promise.all(cachesToDelete.map(deleteCache));
};

self.addEventListener("activate", event => {
  event.waitUntil(deleteOldCaches());
});
