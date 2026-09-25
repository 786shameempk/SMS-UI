/*
 * EduCore service worker: Web Push only (class reminders, "class is live", cancellations).
 * It deliberately does not cache pages or API responses - a school app showing yesterday's timetable
 * offline would do more harm than good, and it keeps deploys instant.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "EduCore", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "EduCore";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/online-classes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/online-classes", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an open EduCore tab if there is one, otherwise open a new window.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
