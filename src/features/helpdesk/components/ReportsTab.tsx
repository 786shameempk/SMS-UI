import { useQuery } from "@tanstack/react-query";
import { AlarmClockCheck, CircleAlert, Clock, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDay } from "@/utils/format";
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from "../constants";
import { getHelpDeskReportsSummary } from "../api";

export default function ReportsTab() {
  const { data: summary, isLoading } = useQuery({ queryKey: ["helpdesk", "reports"], queryFn: getHelpDeskReportsSummary });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Open tickets</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.openCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning-soft text-warning-strong flex items-center justify-center shrink-0">
              <CircleAlert className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">In progress</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.inProgressCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-info-soft text-info-strong flex items-center justify-center shrink-0">
              <ListChecks className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Resolved this month</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.resolvedThisMonth}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success-soft text-success-strong flex items-center justify-center shrink-0">
              <AlarmClockCheck className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg. resolution time</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
                {isLoading || !summary ? "—" : summary.avgResolutionHours === null ? "—" : `${summary.avgResolutionHours}h`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent text-primary-text flex items-center justify-center shrink-0">
              <Clock className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Overdue tickets</CardTitle>
            <CardDescription>Open or in-progress tickets past their priority's SLA window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.overdueTickets.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue.</p>}
            {summary?.overdueTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.ticketNumber} &middot; raised {formatRelativeDay(t.createdAt)}
                  </p>
                </div>
                <Badge variant={PRIORITY_CONFIG[t.priority].variant} className="shrink-0">
                  {PRIORITY_CONFIG[t.priority].label}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by category</CardTitle>
            <CardDescription>All-time breakdown across every status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary?.byCategory.map((row) => (
              <div key={row.category} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{CATEGORY_CONFIG[row.category].label}</span>
                <span className="tabular-nums text-foreground font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by priority</CardTitle>
            <CardDescription>All-time breakdown across every status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary?.byPriority.map((row) => (
              <div key={row.priority} className="flex items-center justify-between text-sm">
                <Badge variant={PRIORITY_CONFIG[row.priority].variant}>{PRIORITY_CONFIG[row.priority].label}</Badge>
                <span className="tabular-nums text-foreground font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
