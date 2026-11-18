// Booty Hunters Service Worker (sw.js)
// Enables background OS pop-up notifications and PWA support on Android & iOS.

const DEFAULT_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%2308434d'/%3E%3Ctext x='50' y='68' font-size='55' text-anchor='middle'%3E%F0%9F%8F%B4%E2%80%8D%E2%98%A0%EF%B8%8F%3C/text%3E%3C/svg%3E";

// Activate immediately on install so updates apply right away
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Claim open app windows immediately so navigator.serviceWorker.controller is active
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first pass-through so index.html updates always load fresh without stale cache issues
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Listen for scheduled notification requests from index.html (e.g. 30s Test Notification)
self.addEventListener("message", (event) => {
  try {
    const data = event.data;
    if (!data || data.type !== "SCHEDULE_NOTIFICATION") return;

    const title = data.title || "🏴‍☠️ Booty Hunters";
    const body = data.body || "Ahoy! New activity on the high seas!";
    const tag = data.tag || `bh-${Date.now()}`;
    const delayMs = Math.max(0, Number(data.delayMs) || 0);

    // event.waitUntil keeps the Service Worker alive on Android while waiting out the delay
    const scheduledTask = new Promise((resolve) => {
      setTimeout(() => {
        self.registration
          .showNotification(title, {
            body: body,
            icon: DEFAULT_ICON,
            badge: DEFAULT_ICON,
            tag: tag,
            renotify: true,
            vibrate: [200, 100, 200]
          })
          .then(resolve)
          .catch(resolve);
      }, delayMs);
    });

    if (event.waitUntil) {
      event.waitUntil(scheduledTask);
    }
  } catch (err) {
    // Prevent unhandled worker exceptions
  }
});

// Handle future Web Push payloads if triggered remotely
self.addEventListener("push", (event) => {
  try {
    let payload = {
      title: "🏴‍☠️ Booty Hunters",
      body: "New booty spotted!"
    };
    if (event.data) {
      try {
        payload = { ...payload, ...event.data.json() };
      } catch (e) {
        payload.body = event.data.text();
      }
    }

    event.waitUntil(
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: DEFAULT_ICON,
        badge: DEFAULT_ICON,
        tag: payload.tag || `bh-push-${Date.now()}`,
        renotify: true,
        vibrate: [200, 100, 200]
      })
    );
  } catch (err) {
    // Ignore malformed push payloads
  }
});

// Focus or open Booty Hunters when the user taps a pop-up notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("./");
        }
      })
  );
});
