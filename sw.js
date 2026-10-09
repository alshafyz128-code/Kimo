// عامل خدمة بسيط: يجعل التطبيق قابلًا للتثبيت على الهاتف
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
