import { urlBase64ToUint8Array } from "@/lib/utils";

const WORKER_URL = __SCHOOLAPP_WORKER_URL__;

/** Authenticate with the SchoolApp Cloudflare Worker and return a signed assertion. */
export async function authenticateWithSchoolApp(
  username: string,
  password: string
): Promise<string> {
  const res = await fetch(`${WORKER_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let message = "SchoolApp authentication failed";
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const data = await res.json();
  if (!data.assertion) throw new Error("SchoolApp returned no assertion");
  return data.assertion;
}

/** Subscribe the browser to Web Push and return the subscription object. */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}
