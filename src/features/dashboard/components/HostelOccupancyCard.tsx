import { BedDouble } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HostelOccupancySummary } from "../types";

export default function HostelOccupancyCard({ hostel }: { hostel: HostelOccupancySummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hostel occupancy</CardTitle>
        <CardDescription>{hostel.mine ? "Your child's boarding details." : "Beds occupied vs. capacity."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {hostel.mine ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-border p-3">
            <BedDouble className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{hostel.mine.hostelName}</p>
              <p className="text-xs text-slate-500 truncate">
                Room {hostel.mine.roomNumber} &middot; Bed {hostel.mine.bedNumber}
              </p>
            </div>
          </div>
        ) : hostel.hostels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active hostels.</p>
        ) : (
          hostel.hostels.map((h) => {
            const pct = h.bedCount ? Math.round((h.occupiedCount / h.bedCount) * 100) : 0;
            return (
              <div key={h.hostelName} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{h.hostelName}</p>
                  <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                    {h.occupiedCount}/{h.bedCount}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
