import { PalmtreeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDay } from "@/utils/format";
import type { HolidayItem } from "../types";

export default function HolidaysCard({ holidays }: { holidays: HolidayItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PalmtreeIcon className="w-4 h-4 text-slate-400" />
          Upcoming holidays
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {holidays.map((h) => (
          <div key={h.id} className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{h.name}</p>
              <p className="text-[11px] text-slate-500">{formatRelativeDay(h.date)}</p>
            </div>
            <Badge variant={h.type === "public" ? "info" : "neutral"} className="shrink-0 capitalize">
              {h.type}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
