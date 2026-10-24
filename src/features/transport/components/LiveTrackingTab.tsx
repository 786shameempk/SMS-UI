import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Bus, Gauge, Info, MapPin, Navigation, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACKING_POLL_MS, TRACKING_STATUS_CONFIG, TRACKING_SOURCE_CONFIG } from "../constants";
import { LoadingState } from "@/components/ui/states";
import { listBusPositions } from "../trackingApi";
import { POSITION_STALE_AFTER_MS } from "../constants";
import type { BusMapMarker } from "./BusMap";
import { useTrackingSettings } from "../useTrackingSettings";
import { listLiveStatuses, resetLiveStatus, simulateGpsPing } from "../api";
import type { BusLiveStatusRow } from "../types";

const BusMap = lazy(() => import("./BusMap"));

function currentStopLabel(row: BusLiveStatusRow, t: TFunction<"transport">): string {
  if (row.status === "idle") return t("At depot — not yet departed");
  if (row.status === "completed") return t("Route completed — arrived at school");
  if (row.currentStopIndex < 0) return t("Departed depot, heading to first stop");
  const stop = row.stops[row.currentStopIndex];
  if (!stop) return t("En route");
  return row.status === "at-stop" ? t("Arrived at {{stop}}", { stop: stop.name }) : t("Heading past {{stop}}", { stop: stop.name });
}

function nextStopLabel(row: BusLiveStatusRow, t: TFunction<"transport">): string | null {
  if (row.status === "completed" || row.status === "idle") return null;
  const nextIndex = row.currentStopIndex + 1;
  const next = row.stops[nextIndex];
  return next ? t("Next: {{stop}} ({{time}})", { stop: next.name, time: next.arrivalTime }) : null;
}

export default function LiveTrackingTab() {
  const { t } = useTranslation("transport");
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["transport", "live-status"], queryFn: listLiveStatuses });

  const source = useTrackingSettings().data?.source ?? "mock";
  const real = source !== "mock";
  const { data: positions = {} } = useQuery({
    queryKey: ["transport", "positions"],
    queryFn: listBusPositions,
    enabled: real,
    refetchInterval: TRACKING_POLL_MS,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const markers = useMemo<BusMapMarker[]>(
    () =>
      rows.flatMap((row) => {
        const p = positions[row.busId];
        return p
          ? [{ id: row.busId, latitude: p.latitude, longitude: p.longitude, heading: p.heading, label: `${row.bus.regNumber} · ${row.route.name}`, stale: now - new Date(p.recordedAt).getTime() > POSITION_STALE_AFTER_MS }]
          : [];
      }),
    [rows, positions, now],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport", "live-status"] });

  const pingMutation = useMutation({
    mutationFn: simulateGpsPing,
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update GPS status")),
  });

  const resetMutation = useMutation({
    mutationFn: resetLiveStatus,
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not reset GPS status")),
  });

  return (
    <div className="space-y-4">
      {real ? (
        <p className="flex items-start gap-1.5 rounded-md bg-info-soft border border-info/30 px-2.5 py-2 text-xs text-info-strong">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {t("Showing real positions from {{source}}. Change this under Tracking setup.", { source: t(TRACKING_SOURCE_CONFIG[source].label).toLowerCase() })}
        </p>
      ) : (
        <p className="flex items-start gap-1.5 rounded-md bg-warning-soft border border-warning/30 px-2.5 py-2 text-xs text-warning-strong">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {t('Simulated: no real GPS is connected. Use "Simulate GPS ping" to advance a bus along its route, or pick a real source under Tracking setup.')}
        </p>
      )}

      {real && markers.length > 0 && (
        <Suspense fallback={<LoadingState label={t("Loading map…")} />}>
          <BusMap markers={markers} label={markers.length === 1 ? t("Map showing {{total}} school bus", { total: markers.length }) : t("Map showing {{total}} school buses", { total: markers.length })} className="h-96 w-full rounded-lg overflow-hidden border border-border" />
        </Suspense>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">{t("Loading live status…")}</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("No buses are currently on an active, bus-assigned route.")}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((row) => {
          const config = TRACKING_STATUS_CONFIG[row.status];
          const next = nextStopLabel(row, t);
          const pos = positions[row.busId];
          return (
            <Card key={row.busId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Bus className="w-4 h-4 text-muted-foreground" />
                    {row.bus.regNumber}
                  </CardTitle>
                  {real ? <Badge variant={pos ? "success" : "neutral"}>{pos ? t("Reporting") : t("No signal yet")}</Badge> : <Badge variant={config.variant}>{t(config.label)}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{row.route.name}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {real ? (
                  <div className="flex items-start gap-2 text-sm text-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    {pos ? (
                      <a
                        className="underline underline-offset-2"
                        href={`https://www.openstreetmap.org/?mlat=${pos.latitude}&mlon=${pos.longitude}#map=16/${pos.latitude}/${pos.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("{{lat}}, {{lng}} (open map)", { lat: pos.latitude.toFixed(5), lng: pos.longitude.toFixed(5) })}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">
                        {source === "hardware" && !row.bus.gpsDeviceId ? t("No GPS device ID set for this bus.") : t("Waiting for the first location.")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p>{currentStopLabel(row, t)}</p>
                      {next && <p className="text-xs text-muted-foreground">{next}</p>}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    {t("{{speed}} km/h", { speed: real ? (pos?.speedKmph ?? 0) : row.speedKmph })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    {real ? (pos ? t("Updated {{time}}", { time: new Date(pos.recordedAt).toLocaleTimeString() }) : t("Not reported")) : t("Updated {{time}}", { time: new Date(row.lastUpdated).toLocaleTimeString() })}
                  </span>
                </div>
                {!real && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={pingMutation.isPending || row.status === "completed"}
                    onClick={() => pingMutation.mutate(row.busId)}
                  >
                    {t("Simulate GPS ping")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resetMutation.isPending || row.status === "idle"}
                    onClick={() => resetMutation.mutate(row.busId)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t("Reset")}
                  </Button>
                </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
