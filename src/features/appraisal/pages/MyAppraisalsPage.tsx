import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { listMyAppraisals } from "../api";
import { NS, PARTICIPANT_STATUS, StatusBadge, formatDate, score } from "../shared";

import { useTranslation } from "react-i18next";

/** The signed-in employee's own appraisals. A result only appears once it is finalized and released to them. */
export default function MyAppraisalsPage() {
  const { t } = useTranslation(NS);
  const query = useQuery({ queryKey: ["appraisal", "mine"], queryFn: listMyAppraisals });

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />;
  if (!query.data || query.data.length === 0) {
    return <EmptyState icon={Award} title={t("No appraisals yet")} description={t("When you are included in an appraisal cycle it appears here, with your results once they are released.")} />;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {query.data.map((a) => (
        <Card key={a.participantId}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 truncate font-medium">{a.cycleName}</h3>
              <StatusBadge map={PARTICIPANT_STATUS} value={a.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {a.resultsReleased ? (a.overallScore !== null && a.overallScore !== undefined ? t("Overall score {{score}}", { score: score(a.overallScore) }) : t("Result released")) : t("Your result will appear here once it is finalized and released.")}
              {a.finalizedAt ? ` · ${formatDate(a.finalizedAt)}` : ""}
            </p>
            <div className="flex justify-end">
              <Button asChild size="sm" variant="outline">
                <Link to={`/appraisal/results/${a.participantId}`}>{t("Open")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
