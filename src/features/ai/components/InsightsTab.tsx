import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bus, CreditCard, GraduationCap, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INSIGHT_AREA_CONFIG } from "../constants";
import { getInsights } from "../api";
import type { Insight, InsightArea } from "../types";

const AREA_ICON: Record<InsightArea, typeof Bus> = {
  attendance: Bus,
  academics: GraduationCap,
  fees: CreditCard,
  admissions: UserPlus,
};

export default function InsightsTab() {
  const queryClient = useQueryClient();
  const { data: insights = [], isLoading, isFetching } = useQuery({ queryKey: ["ai", "insights"], queryFn: getInsights });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-lg">
          Auto-generated summaries over this school's real, live data — no external model, just rule-based templates applied to today's numbers.
        </p>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["ai", "insights"] })} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight: Insight) => {
          const Icon = AREA_ICON[insight.area];
          return (
            <Card key={insight.area}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-accent text-primary-text flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{INSIGHT_AREA_CONFIG[insight.area].label}</p>
                    <CardTitle className="text-base">{insight.headline}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {insight.bullets.map((b, i) => (
                    <li key={i} className="text-sm text-secondary-foreground pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-slate-400">
                      {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
