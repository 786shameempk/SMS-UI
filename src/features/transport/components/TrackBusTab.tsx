import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bus, CheckCircle2, Clock, Gauge, MapPin, Navigation, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { cn } from "@/utils/cn";
import { POSITION_STALE_AFTER_MS, TRACKING_POLL_MS, TRACKING_SOURCE_CONFIG, TRACKING_STATUS_CONFIG } from "../constants";
import { getChildBusTracking } from "../trackingApi";
import type { ChildBusTracking } from "../types";

const BusMap = lazy(() => import("./BusMap"));

function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Plain-language trip status for the Demo source, from the stop the bus has reached. */
function demoSummary(t: ChildBusTracking): { headline: string; detail?: string } {
  const { live, stops, stopId } = t;
  const mineIndex = stops.findIndex((s) => s.id === stopId);
  const mine = stops[mineIndex];
  if (!live || live.status === "idle") {
    return { headline: "The bus has not started its trip yet.", detail: stops[0] ? `First pickup is scheduled around ${stops[0].arrivalTime}.` : undefined };
  }
  if (live.status === "completed") return { headline: "The bus has reached school.", detail: "This trip is complete." };
  const away = mineIndex - live.currentStopIndex;
  if (away === 0 && live.status === "at-stop") return { headline: "The bus is at your child's stop right now." };
  if (away <= 0) return { headline: "The bus has passed your child's stop.", detail: mine ? `It was scheduled for ${mine.arrivalTime}.` : undefined };
  return {
    headline: away === 1 ? "The bus is 1 stop away from your child's stop." : `The bus is ${away} stops away from your child's stop.`,
    detail: mine ? `Scheduled arrival at ${mine.name}: ${mine.arrivalTime}.` : undefined,
  };
}

function StopProgress({ t, showProgress }: { t: ChildBusTracking; showProgress: boolean }) {
  const { stops, live, stopId } = t;
  const reached = !showProgress || !live ? 0 : live.status === "completed" ? stops.length : live.currentStopIndex + (live.status === "at-stop" ? 1 : 0);
  return (
    <ol>
      {stops.map((stop, i) => {
        const done = i < reached;
        const isMine = stop.id === stopId;
        return (
          <li key={stop.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("mt-1 h-3 w-3 rounded-full border-2", done ? "bg-primary border-primary" : "bg-background border-border", isMine && "ring-2 ring-primary/30")} />
              {i < stops.length - 1 && <span className={cn("w-0.5 flex-1 min-h-6", done ? "bg-primary" : "bg-border")} />}
            </div>
            <div className="pb-3">
              <p className="text-sm text-foreground">
                <span className={isMine ? "font-semibold" : undefined}>{stop.name}</span>
                {isMine && (
                  <Badge variant="brand" className="ml-2">
                    Your stop
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{stop.arrivalTime}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Parent's "Track bus": where the child's bus is, from whichever source the school uses (the server tells us which). */
export default function TrackBusTab({ studentId }: { studentId: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const { data: t, isLoading } = useQuery({
    queryKey: ["transport", "child-tracking", studentId],
    queryFn: () => getChildBusTracking(studentId),
    refetchInterval: TRACKING_POLL_MS,
  });

  const position = t?.position ?? null;
  const bus = t?.bus;
  const markers = useMemo(
    () => (position && bus ? [{ id: bus.id, latitude: position.latitude, longitude: position.longitude, heading: position.heading, label: `Bus ${bus.regNumber}` }] : []),
    [position, bus],
  );

  if (isLoading) return <LoadingState label="Finding your child's bus…" />;
  if (!t) {
    return <EmptyState icon={Bus} title="No school bus assigned" description="Your child isn't on a school bus route. Contact the school office if this is wrong." />;
  }

  const real = t.source !== "mock";
  const stale = position ? now - new Date(position.recordedAt).getTime() > POSITION_STALE_AFTER_MS : false;
  const demo = demoSummary(t);
  const liveStatus = TRACKING_STATUS_CONFIG[t.live?.status ?? "idle"];
  const myStop = t.stops.find((s) => s.id === t.stopId);

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t.bus ? t.bus.regNumber : "Bus not assigned to this route"}
            </CardTitle>
            <div className="flex items-center gap-2">
              {real && position && (
                <Badge variant={stale ? "warning" : "success"} dot>
                  {stale ? "Last seen" : "Live"}
                </Badge>
              )}
              {!real && <Badge variant={liveStatus.variant}>{liveStatus.label}</Badge>}
              <Badge variant="neutral">{TRACKING_SOURCE_CONFIG[t.source].short}</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.routeName} · {t.startTime}–{t.endTime}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!real && (
            <>
              <div aria-live="polite">
                <p className="text-sm font-medium text-foreground">{demo.headline}</p>
                {demo.detail && <p className="text-sm text-muted-foreground">{demo.detail}</p>}
              </div>
              <p className="rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning-strong">Demo mode: this bus movement is simulated, not from a real GPS.</p>
            </>
          )}

          {real && !t.bus && <p className="text-sm text-muted-foreground">No bus has been assigned to this route yet.</p>}

          {real && t.bus && !position && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Radio className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-foreground">Waiting for the bus to share its location</p>
              <p className="text-xs text-muted-foreground">{t.source === "driver-phone" ? "The driver starts location sharing when the trip begins." : "The bus's GPS tracker hasn't reported yet."}</p>
            </div>
          )}

          {real && position && (
            <>
              <div aria-live="polite">
                <p className="text-sm font-medium text-foreground">{stale ? `Last seen ${timeAgo(position.recordedAt, now)}` : "The bus is on its way."}</p>
                {stale && <p className="text-sm text-muted-foreground">The location hasn't updated recently, so the bus may be out of signal.</p>}
                {myStop && (
                  <p className="text-sm text-muted-foreground">
                    Your child's stop: {myStop.name}, scheduled {myStop.arrivalTime}.
                  </p>
                )}
              </div>
              <Suspense fallback={<LoadingState label="Loading map…" />}>
                <BusMap markers={markers} label={`Map showing the location of bus ${t.bus?.regNumber ?? ""}`} />
              </Suspense>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                  {position.speedKmph} km/h
                </span>
                <span className="flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  Updated {timeAgo(position.recordedAt, now)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Refreshes every {TRACKING_POLL_MS / 1000}s
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Route stops
          </CardTitle>
        </CardHeader>
        <CardContent>
          {t.stops.length === 0 ? <p className="text-sm text-muted-foreground">No stops set up for this route.</p> : <StopProgress t={t} showProgress={!real} />}
          {!real && t.live?.status === "completed" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Trip complete
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
