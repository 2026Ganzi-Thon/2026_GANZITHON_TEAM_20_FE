
self.addEventListener("push", (event) => {
  let data;

  try {
    data = event.data?.json() ?? {};
  } catch {
    data = {
      title: "심야 걱정 금고",
      body: event.data?.text() ?? "새로운 알림이 도착했어요.",
    };
  }

  const title = data.title || "심야 걱정 금고";

  const options = {
    body: data.body || "새로운 알림이 도착했어요.",
    icon: "/favicon.ico",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const rawUrl = event.notification.data?.url || "/";
      const targetUrl = new URL(rawUrl, self.location.origin);

      // 외부 주소로 이동하지 않도록 제한
      if (targetUrl.origin !== self.location.origin) {
        return;
      }

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if (new URL(client.url).origin === targetUrl.origin) {
          await client.navigate(targetUrl.href);
          await client.focus();
          return;
        }
      }

      await self.clients.openWindow(targetUrl.href);
    })()
  );
});
