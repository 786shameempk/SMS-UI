import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bus, Gauge, Info, MapPin, Navigation, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACKING_STATUS_CONFIG } from "../constants";
import { listLiveStatuses, resetLiveStatus, simulateGpsPing } from "../api";
import type { BusLiveStatusRow } from "../types";

function currentStopLabel(row: BusLiveStatusRow): string {
  if (row.status === "idle") return "At depot — not yet departed";
  if (row.status === "completed") return "Route completed — arrived at school";
  if (row.currentStopIndex < 0) return "Departed depot, heading to first stop";
  const stop = row.stops[row.currentStopIndex];
  return stop ? `${row.status === "at-stop" ? "Arrived at" : "Heading past"} ${stop.name}` : "En route";
}

function nextStopLabel(row: BusLiveStatusRow): string | null {
  if (row.status === "completed" || row.status === "idle") return null;
  const nextIndex = row.currentStopIndex + 1;
  const next = row.stops[nextIndex];
  return next ? `Next: ${next.name} (${next.arrivalTime})` : null;
}

export default function LiveTrackingTab() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["transport", "live-status"], queryFn: listLiveStatuses });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport", "live-status"] });

  const pingMutation = useMutation({
    mutationFn: simulateGpsPing,
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update GPS status"),
  });

  const resetMutation = useMutation({
    mutationFn: resetLiveStatus,
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not reset GPS status"),
  });

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-1.5 rounded-md bg-warning-soft border border-warning/30 px-2.5 py-2 text-xs text-warning-strong">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Simulated — real GPS hardware integration is not available in this demo. Use "Simulate GPS ping" to advance a bus along its route.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Loading live status…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No buses are currently on an active, bus-assigned route.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((row) => {
          const config = TRACKING_STATUS_CONFIG[row.status];
          const next = nextStopLabel(row);
          return (
            <Card key={row.busId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Bus className="w-4 h-4 text-muted-foreground" />
                    {row.bus.regNumber}
                  </CardTitle>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{row.route.name}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p>{currentStopLabel(row)}</p>
                    {next && <p className="text-xs text-muted-foreground">{next}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    {row.speedKmph} km/h
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    Updated {new Date(row.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={pingMutation.isPending || row.status === "completed"}
                    onClick={() => pingMutation.mutate(row.busId)}
                  >
                    Simulate GPS ping
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resetMutation.isPending || row.status === "idle"}
                    onClick={() => resetMutation.mutate(row.busId)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
