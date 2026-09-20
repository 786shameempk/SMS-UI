import { useQuery } from "@tanstack/react-query";
import { Clock, DoorOpen, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PURPOSE_CONFIG } from "../constants";
import { getVisitorReportsSummary } from "../api";

export default function ReportsTab() {
  const { data: summary, isLoading } = useQuery({ queryKey: ["visitors", "reports"], queryFn: getVisitorReportsSummary });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Currently on premises</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.currentlyOnPremises}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <DoorOpen className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Visits today</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.visitsToday}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Visits (30 days)</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.visitsLast30Days}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg. visit duration</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
                {isLoading || !summary ? "—" : summary.avgVisitDurationMinutes === null ? "—" : `${summary.avgVisitDurationMinutes}m`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Clock className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Visits by purpose</CardTitle>
            <CardDescription>All-time breakdown of why visitors came in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.visitsByPurpose.length === 0 && <p className="text-sm text-muted-foreground">No visits logged yet.</p>}
            {summary?.visitsByPurpose.map((row) => (
              <div key={row.purpose} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{PURPOSE_CONFIG[row.purpose].label}</span>
                <span className="tabular-nums text-slate-800 font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most-visited hosts</CardTitle>
            <CardDescription>Staff, students, or places visitors come to see most often.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.topHosts.length === 0 && <p className="text-sm text-muted-foreground">No visits logged yet.</p>}
            {summary?.topHosts.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 truncate">{row.label}</span>
                <span className="tabular-nums text-slate-800 font-medium shrink-0 ml-2">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
