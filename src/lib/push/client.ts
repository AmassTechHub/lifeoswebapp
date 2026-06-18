function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  // Register defensively here too — don't rely solely on PWARegister's
  // mount-time call, which swallows failures silently and could leave
  // navigator.serviceWorker.ready hanging forever with nothing to resolve it.
  await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => null);
  return withTimeout(
    navigator.serviceWorker.ready,
    10_000,
    "Service worker did not activate in time. Try reloading the page."
  );
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const registration = await getReadyRegistration();
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) throw new Error("Push notifications are not configured on this deployment yet");
  if (!pushSupported()) throw new Error("This browser does not support push notifications");

  const permission = await withTimeout(
    Notification.requestPermission(),
    30_000,
    "No response to the permission prompt"
  );
  if (permission !== "granted") throw new Error("Notification permission was not granted");

  const registration = await getReadyRegistration();
  const subscription = await withTimeout(
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }),
    10_000,
    "Push subscription timed out"
  );

  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!res.ok) throw new Error("Failed to save subscription on the server");
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => null);
}
