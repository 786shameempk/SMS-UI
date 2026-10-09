import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { TRACKING_SOURCE_CONFIG, TRACKING_SOURCE_OPTIONS } from "../constants";
import { listBuses } from "../api";
import { updateTrackingSettings } from "../trackingApi";
import { TRACKING_SETTINGS_KEY, useTrackingSettings } from "../useTrackingSettings";
import type { TrackingSource } from "../types";

export default function TrackingSetupTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useTrackingSettings();
  const { data: buses = [] } = useQuery({ queryKey: ["transport", "buses"], queryFn: listBuses });
  const [picked, setChoice] = useState<TrackingSource | null>(null);
  const choice = picked ?? settings?.source ?? "mock";

  const save = useMutation({
    mutationFn: updateTrackingSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(TRACKING_SETTINGS_KEY, { source: saved.source });
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      if (saved.savedOnServer) toast.success("Tracking source saved");
      else toast("Saved on this browser only. The server does not support this setting yet, so other users will not see the change.", { icon: "⚠️", duration: 7000 });
    },
  });

  const withDevice = buses.filter((b) => b.gpsDeviceId);
  const missing = buses.filter((b) => b.status === "active" && !b.gpsDeviceId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How should parents see the bus?</CardTitle>
          <p className="text-sm text-muted-foreground">Pick one. Parents see the result in the “Track bus” tab of the Parent Portal. You can change it any time.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div role="radiogroup" aria-label="Tracking source" className="grid gap-3 md:grid-cols-3">
            {TRACKING_SOURCE_OPTIONS.map(({ value }) => {
              const config = TRACKING_SOURCE_CONFIG[value];
              const selected = choice === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1.5 rounded-lg border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-input",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input type="radio" name="tracking-source" value={value} checked={selected} onChange={() => setChoice(value)} className="accent-[var(--color-primary)]" />
                    <span className="text-sm font-medium text-foreground">{config.label}</span>
                    {settings?.source === value && <Badge variant="success">Current</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground">{config.description}</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button disabled={isLoading || save.isPending || choice === settings?.source} onClick={() => save.mutate(choice)}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {choice === "driver-phone" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Driver's phone: how it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Give each driver a SchoolSphere login with transport access.</li>
              <li>The driver opens Transport → <strong className="text-foreground">Driver trip</strong> on their phone and allows location access.</li>
              <li>They pick their bus and tap <strong className="text-foreground">Start trip</strong>. Keep the screen on and the page open during the trip.</li>
              <li>Parents see the bus move on the map, refreshed every 10 seconds.</li>
            </ol>
            <p className="flex items-start gap-1.5 text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Phones only share location over HTTPS. The location is sent only while a trip is running and stops when the driver taps End trip.
            </p>
          </CardContent>
        </Card>
      )}

      {choice === "hardware" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">GPS trackers: device IDs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Each tracker reports on its own to <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/buspositions/device-ping</code> using its device ID. Enter the same ID for the bus under
              the <strong className="text-foreground">Buses</strong> tab (GPS device ID) so SchoolSphere knows which bus it belongs to.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{withDevice.length} bus{withDevice.length === 1 ? "" : "es"} with a device ID</Badge>
              {missing.length > 0 && <Badge variant="warning">{missing.length} active without one</Badge>}
            </div>
            {missing.length > 0 && <p className="text-xs">Missing a device ID: {missing.map((b) => b.regNumber).join(", ")}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
