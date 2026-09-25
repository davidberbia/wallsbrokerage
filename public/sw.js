// Service worker minimal : nécessaire pour installer l'app et apparaître dans « Partager ».
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
