import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { listMyReviews } from "../api";
import { ASSIGNMENT_STATUS, NS, StatusBadge, formatDate, groupLabel } from "../shared";

import { useTranslation } from "react-i18next";

/** Everything the signed-in person has been asked to review or self-assess. Students and parents see only their own assignments. */
export default function PendingReviewsPage() {
  const { t } = useTranslation(NS);
  const [includeSubmitted, setIncludeSubmitted] = useState(false);
  const query = useQuery({ queryKey: ["appraisal", "my-reviews", includeSubmitted], queryFn: () => listMyReviews(includeSubmitted) });

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={includeSubmitted} onCheckedChange={setIncludeSubmitted} aria-label={t("Show submitted reviews")} />
        {t("Show submitted reviews")}
      </label>

      {query.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("No reviews waiting for you")} description={t("When a feedback or appraisal review is assigned to you it appears here.")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {query.data.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{r.appraisee}</h3>
                    <p className="text-sm text-muted-foreground">
                      {r.cycleName} · {t(groupLabel(r.reviewerGroup))}
                      {r.context ? ` · ${r.context}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.overdue && <Badge variant="danger">{t("Overdue")}</Badge>}
                    <StatusBadge map={ASSIGNMENT_STATUS} value={r.status} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{r.deadline ? t("Due {{date}}", { date: formatDate(r.deadline) }) : t("No deadline")}</p>
                <div className="mt-auto flex justify-end">
                  <Button asChild size="sm" variant={r.canEdit ? "default" : "outline"}>
                    <Link to={`/appraisal/review/${r.id}`}>{r.canEdit ? (r.status === "Draft" ? t("Continue") : t("Start review")) : t("View")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
