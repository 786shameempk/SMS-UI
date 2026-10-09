import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPinned, Play, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACKING_POLL_MS } from "../constants";
import { getMyDriverBuses, sendDriverPing } from "../trackingApi";
import { useTrackingSettings } from "../useTrackingSettings";

type TripState = "idle" | "starting" | "sharing";

/** Where a driver starts and ends a trip. While it runs, this page reports the phone's location about every 10 seconds. */
export default function DriverTripTab() {
  const { data: settings } = useTrackingSettings();
  const { data: myBuses = [], isLoading, isError, error: busesError } = useQuery({ queryKey: ["transport", "my-buses"], queryFn: getMyDriverBuses });

  const [chosen, setBusId] = useState("");
  // A driver of one bus never has to pick.
  const busId = chosen || (myBuses.length === 1 ? myBuses[0].busId : "");
  const [state, setState] = useState<TripState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [sentCount, setSentCount] = useState(0);

  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    wakeLock.current?.release().catch(() => undefined);
    wakeLock.current = null;
    setState("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const wrongSource = settings && settings.source !== "driver-phone";

  const start = async () => {
    if (!busId) return;
    setError(null);
    setState("starting");
    try {
      wakeLock.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      /* optional: the trip still works, the screen may just dim */
    }
    lastSentAt.current = 0;
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setState("sharing");
        const now = Date.now();
        if (now - lastSentAt.current < TRACKING_POLL_MS) return;
        lastSentAt.current = now;
        try {
          await sendDriverPing({
            busId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speedKmph: (pos.coords.speed ?? 0) * 3.6,
            heading: pos.coords.heading ?? undefined,
            accuracyMeters: pos.coords.accuracy,
          });
          setLastSent(new Date());
          setSentCount((n) => n + 1);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not send location");
        }
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? "Location access was blocked. Allow it for this site in your browser settings, then start again." : "Could not get this phone's location.");
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  };

  const sharing = state !== "idle";

  return (
    <Card className="max-w-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPinned className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Driver trip
        </CardTitle>
        <p className="text-sm text-muted-foreground">Share this phone's location with parents while you drive. Keep this page open and the screen on.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {wrongSource && (
          <p className="rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning-strong">
            The school is not using driver phones for tracking right now, so parents will not see this location. An admin can change it under Tracking setup.
          </p>
        )}
        {!supported && <p className="text-sm text-danger">This device or browser cannot share location.</p>}

        {isError && <p role="alert" className="text-sm text-danger">{busesError instanceof Error ? busesError.message : "Could not load your bus."}</p>}
        {!isLoading && !isError && myBuses.length === 0 && (
          <p className="rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning-strong">
            No bus is assigned to you. You can only share the bus you drive: ask the school office to link your login to your staff record and assign you to a bus route.
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="driver-bus" className="text-sm font-medium text-foreground">Bus</label>
          <select
            id="driver-bus"
            value={busId}
            disabled={sharing}
            onChange={(e) => setBusId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            <option value="">{isLoading ? "Loading…" : "Select your bus"}</option>
            {myBuses.map((b) => (
              <option key={b.busId} value={b.busId}>
                {b.regNumber} ({b.routeName})
              </option>
            ))}
          </select>
        </div>

        {sharing ? (
          <Button variant="outline" className="w-full" onClick={stop}>
            <Square className="h-4 w-4" aria-hidden="true" />
            End trip
          </Button>
        ) : (
          <Button className="w-full" disabled={!busId || !supported} onClick={start}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Start trip
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {state === "sharing" && <Badge variant="success" dot>Sharing location</Badge>}
          {state === "starting" && <Badge variant="info">Waiting for GPS…</Badge>}
          {lastSent && <span>Last sent {lastSent.toLocaleTimeString()} ({sentCount} updates)</span>}
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
