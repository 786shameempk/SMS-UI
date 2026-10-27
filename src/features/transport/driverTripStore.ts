import { useSyncExternalStore } from "react";
import { TRACKING_POLL_MS } from "./constants";
import { sendDriverPing } from "./trackingApi";

/**
 * The driver's running trip lives here, outside any React page, so changing tab or menu doesn't stop it. It runs
 * until End trip, sign-out or the browser tab closing (browsers only deliver location to a page that is open).
 */

export type TripState = "idle" | "starting" | "sharing";

export interface TripSnapshot {
  state: TripState;
  busId: string | null;
  busLabel: string | null;
  error: string | null;
  lastSent: Date | null;
  sentCount: number;
}

const IDLE: TripSnapshot = { state: "idle", busId: null, busLabel: null, error: null, lastSent: null, sentCount: 0 };

let snapshot: TripSnapshot = IDLE;
const listeners = new Set<() => void>();
let watchId: number | null = null;
let lastSentAt = 0;
let wakeLock: WakeLockSentinel | null = null;

function set(patch: Partial<TripSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

async function acquireWakeLock() {
  try {
    wakeLock = (await navigator.wakeLock?.request("screen")) ?? null;
  } catch {
    /* optional: the trip still works, the screen may just dim */
  }
}

// The browser drops a wake lock when the page is hidden; take it again when the driver comes back.
function onVisible() {
  if (document.visibilityState === "visible" && watchId != null) void acquireWakeLock();
}

export function stopTrip() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  wakeLock?.release().catch(() => undefined);
  wakeLock = null;
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("beforeunload", onUnload);
  set({ ...IDLE, lastSent: snapshot.lastSent, sentCount: snapshot.sentCount, error: snapshot.error });
}

function onUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
}

export async function startTrip(busId: string, busLabel: string, messages: { blocked: string; unavailable: string; sendFailed: string }) {
  if (watchId != null) return;
  set({ ...IDLE, state: "starting", busId, busLabel });
  await acquireWakeLock();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("beforeunload", onUnload);
  lastSentAt = 0;
  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      if (snapshot.state === "starting") set({ state: "sharing" });
      const now = Date.now();
      if (now - lastSentAt < TRACKING_POLL_MS) return;
      lastSentAt = now;
      try {
        await sendDriverPing({
          busId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speedKmph: (pos.coords.speed ?? 0) * 3.6,
          heading: pos.coords.heading ?? undefined,
          accuracyMeters: pos.coords.accuracy,
        });
        set({ lastSent: new Date(), sentCount: snapshot.sentCount + 1, error: null });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : messages.sendFailed });
      }
    },
    (err) => {
      const error = err.code === err.PERMISSION_DENIED ? messages.blocked : messages.unavailable;
      stopTrip();
      set({ error });
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
}

export function useDriverTrip(): TripSnapshot {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
}
