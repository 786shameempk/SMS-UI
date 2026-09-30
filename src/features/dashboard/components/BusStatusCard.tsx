import { Bus, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { TRACKING_STATUS_CONFIG } from "@/features/transport/constants";
import type { BusStatusSummary } from "../types";

export default function BusStatusCard({ busStatus }: { busStatus: BusStatusSummary }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Bus status</CardTitle>
        <CardDescription>{busStatus.mine ? "Your child's transport." : "Live fleet status."}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {busStatus.mine ? (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <Bus className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{busStatus.mine.busRegNumber}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {busStatus.mine.routeName}
                  {busStatus.mine.currentStopName && (
                    <>
                      <MapPin className="w-3 h-3" />
                      {busStatus.mine.currentStopName}
                    </>
                  )}
                </p>
              </div>
            </div>
            <Badge variant={TRACKING_STATUS_CONFIG[busStatus.mine.status].variant} className="shrink-0">
              {TRACKING_STATUS_CONFIG[busStatus.mine.status].label}
            </Badge>
          </div>
        ) : busStatus.fleet.length === 0 ? (
          <EmptyState bare size="sm" icon={Bus} title="No routes running" description="Live buses appear here during trips." className="h-full py-6" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {busStatus.fleet.map((f) => (
              <div key={f.status} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <Badge variant={TRACKING_STATUS_CONFIG[f.status].variant}>{TRACKING_STATUS_CONFIG[f.status].label}</Badge>
                <span className="text-sm font-semibold text-foreground tabular-nums">{f.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
