import { useCallback, useEffect, useState } from "react";
import { engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";

/**
 * Web Push for class reminders (design section 23: "Use push notifications for upcoming classes").
 * EngagementService owns delivery; this only registers the device. Permission is asked for from an explicit
 * button tap, never on page load.
 */

interface PushStatus {
  enabled: boolean;
  publicKey: string | null;
  myDevices: number;
}

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Registers the service worker once per page load. Safe to call repeatedly. */
export function registerServiceWorker() {
  if (!pushSupported()) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // No service worker = no push; the rest of the app is unaffected.
  });
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type PushState = "unsupported" | "server-off" | "denied" | "off" | "on" | "loading";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!pushSupported()) return setState("unsupported");
    try {
      const { data } = await engagementHttpClient.get<PushStatus>("api/push/status");
      setStatus(data);
      if (!data.enabled || !data.publicKey) return setState("server-off");
      if (Notification.permission === "denied") return setState("denied");
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "on" : "off");
    } catch {
      setState("server-off");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!status?.publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(status.publicKey) }));
      await engagementHttpClient.post("api/push/subscriptions", subscription.toJSON());
      setState("on");
    } catch (err) {
      throw new Error(extractApiErrorMessage(err, "Couldn't turn on notifications on this device."));
    } finally {
      setBusy(false);
    }
  }, [status]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await engagementHttpClient.delete("api/push/subscriptions", { params: { endpoint: subscription.endpoint } }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
