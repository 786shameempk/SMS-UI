import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPinned, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stopTrip, useDriverTrip } from "../driverTripStore";

/** Shown on every page while a trip is running, so the driver can see it is live and end it from anywhere. */
export default function DriverTripBanner() {
  const { t } = useTranslation("transport");
  const trip = useDriverTrip();
  // This lives in the signed-in shell, so it unmounts on sign-out: a trip must not keep reporting for a signed-out driver.
  useEffect(() => stopTrip, []);
  if (trip.state === "idle") return null;
  return (
    <div role="status" className="flex items-center gap-2 border-b border-success/30 bg-success-soft px-4 py-1.5 text-xs text-success-strong">
      <MapPinned className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">
        {trip.state === "starting" ? t("Waiting for GPS…") : t("Sharing location")}
        {trip.busLabel ? ` · ${trip.busLabel}` : ""}
        {trip.error ? ` · ${trip.error}` : ""}
      </span>
      <Link to="/transport" className="font-medium underline">{t("Open")}</Link>
      <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={stopTrip}>
        <Square className="h-3 w-3" aria-hidden="true" /> {t("End trip")}
      </Button>
    </div>
  );
}
