import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MapPinned, Play, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyDriverBuses } from "../trackingApi";
import { startTrip, stopTrip, useDriverTrip } from "../driverTripStore";
import { useTrackingSettings } from "../useTrackingSettings";

/** Where a driver starts and ends a trip. While it runs, this page reports the phone's location about every 10 seconds. */
export default function DriverTripTab() {
  const { t } = useTranslation("transport");
  const { data: settings } = useTrackingSettings();
  const { data: myBuses = [], isLoading, isError, error: busesError } = useQuery({ queryKey: ["transport", "my-buses"], queryFn: getMyDriverBuses });

  const [chosen, setBusId] = useState("");
  // A driver of one bus never has to pick.
  const busId = chosen || (myBuses.length === 1 ? myBuses[0].busId : "");
  // The trip itself lives in driverTripStore, so it keeps running when this tab or page is left.
  const trip = useDriverTrip();
  const { state, error, lastSent, sentCount } = trip;

  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const wrongSource = settings && settings.source !== "driver-phone";

  const start = () => {
    if (!busId) return;
    const bus = myBuses.find((b) => b.busId === busId);
    void startTrip(busId, bus ? `${bus.regNumber} (${bus.routeName})` : busId, {
      blocked: t("Location access was blocked. Allow it for this site in your browser settings, then start again."),
      unavailable: t("Could not get this phone's location."),
      sendFailed: t("Could not send location"),
    });
  };

  const sharing = state !== "idle";

  return (
    <Card className="max-w-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPinned className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t("Driver trip")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("Share this phone's location with parents while you drive. It keeps running if you change tab or menu until you press End trip. Keep this browser tab open.")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {wrongSource && (
          <p className="rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning-strong">
            {t("The school is not using driver phones for tracking right now, so parents will not see this location. An admin can change it under Tracking setup.")}
          </p>
        )}
        {!supported && <p className="text-sm text-danger">{t("This device or browser cannot share location.")}</p>}

        {isError && <p role="alert" className="text-sm text-danger">{busesError instanceof Error ? busesError.message : t("Could not load your bus.")}</p>}
        {!isLoading && !isError && myBuses.length === 0 && (
          <p className="rounded-md border border-warning/30 bg-warning-soft px-2.5 py-2 text-xs text-warning-strong">
            {t("No bus is assigned to you. You can only share the bus you drive: ask the school office to link your login to your staff record and assign you to a bus route.")}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="driver-bus" className="text-sm font-medium text-foreground">{t("Bus")}</label>
          <select
            id="driver-bus"
            value={trip.busId ?? busId}
            disabled={sharing}
            onChange={(e) => setBusId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            <option value="">{isLoading ? t("Loading…") : t("Select your bus")}</option>
            {myBuses.map((b) => (
              <option key={b.busId} value={b.busId}>
                {b.regNumber} ({b.routeName})
              </option>
            ))}
          </select>
        </div>

        {sharing ? (
          <Button variant="outline" className="w-full" onClick={stopTrip}>
            <Square className="h-4 w-4" aria-hidden="true" />
            {t("End trip")}
          </Button>
        ) : (
          <Button className="w-full" disabled={!busId || !supported} onClick={start}>
            <Play className="h-4 w-4" aria-hidden="true" />
            {t("Start trip")}
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {state === "sharing" && <Badge variant="success" dot>{t("Sharing location")}</Badge>}
          {state === "starting" && <Badge variant="info">{t("Waiting for GPS…")}</Badge>}
          {lastSent && <span>{t("Last sent {{time}} ({{updates}} updates)", { time: lastSent.toLocaleTimeString(), updates: sentCount })}</span>}
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
