
import {
  getNotificationSettings,
  registerPushSubscription,
} from "./settings";

// VAPID 공개키를 Uint8Array로 변환
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

// 브라우저 푸시 지원 여부
export function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

// Service Worker 등록
export async function registerServiceWorker() {
  if (!isPushSupported()) {
    throw new Error("PUSH_UNSUPPORTED");
  }

  return navigator.serviceWorker.register("/sw.js");
}

// 브라우저 푸시 구독
export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error("PUSH_UNSUPPORTED");
  }

  if (Notification.permission === "denied") {
    throw new Error("PUSH_DENIED");
  }

  // Ask directly from the click gesture, before network or worker awaits (mobile Safari).
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('PUSH_DENIED');
  }
  const registration = await registerServiceWorker();
  if (!registration.active) {
    const worker = registration.installing || registration.waiting;
    if (!worker) throw new Error('PUSH_WORKER_UNAVAILABLE');
    await new Promise((resolve, reject) => {
      const finish = error => { clearTimeout(timer); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve(); };
      const changed = () => { if (worker.state === 'activated') finish(); else if (worker.state === 'redundant') finish(new Error('PUSH_WORKER_UNAVAILABLE')); };
      const timer = setTimeout(() => finish(new Error('PUSH_WORKER_TIMEOUT')), 10000);
      worker.addEventListener('statechange', changed);
      changed();
    });
  }

  // 기존 구독 확인
  let subscription =
    await registration.pushManager.getSubscription();

  // 서버에서 VAPID 공개키 조회
  const settings = await getNotificationSettings();

  const publicKey = settings?.vapidPublicKey;

  if (!publicKey && !subscription) {
    throw new Error("VAPID_KEY_MISSING");
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  // 서버에 구독 정보 등록
  await registerPushSubscription(subscription);

  return subscription;
}
