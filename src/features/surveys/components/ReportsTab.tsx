import { useQuery } from "@tanstack/react-query";
import { ClipboardList, MessageSquareText, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AUDIENCE_CONFIG } from "../constants";
import { getSurveysReportsSummary } from "../api";

export default function ReportsTab() {
  const { data: summary, isLoading } = useQuery({ queryKey: ["surveys", "reports"], queryFn: getSurveysReportsSummary });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total surveys</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.totalSurveys}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent text-primary-text flex items-center justify-center shrink-0">
              <ClipboardList className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Published</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.publishedSurveys}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success-soft text-success-strong flex items-center justify-center shrink-0">
              <TrendingUp className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total responses</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.totalResponses}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-info-soft text-info-strong flex items-center justify-center shrink-0">
              <MessageSquareText className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg. responses / survey</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.avgResponsesPerSurvey}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning-soft text-warning-strong flex items-center justify-center shrink-0">
              <Users className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Responses by audience</CardTitle>
          <CardDescription>Which groups are engaging most with surveys.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!isLoading && summary?.responsesByAudience.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
          {summary?.responsesByAudience.map((row) => (
            <div key={row.audience} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{AUDIENCE_CONFIG[row.audience].label}</span>
              <span className="tabular-nums text-foreground font-medium">{row.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
