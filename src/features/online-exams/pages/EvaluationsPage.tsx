import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardPenLine, PartyPopper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { getEvaluationQueue } from "../api";
import { formatExamTime, isExamStaff } from "../constants";

export default function EvaluationsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const queue = useQuery({ queryKey: ["online-exams", "evaluations"], queryFn: getEvaluationQueue, enabled: isExamStaff(role) });

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my" replace />;

  const items = queue.data ?? [];
  const totalAttempts = items.reduce((n, i) => n + i.attemptsPending, 0);

  return (
    <PageContainer width="medium">
      <PageHeader
        icon={ClipboardPenLine}
        title="Pending evaluation"
        description={
          items.length
            ? `${totalAttempts} submission${totalAttempts === 1 ? "" : "s"} across ${items.length} exam${items.length === 1 ? "" : "s"} have short or long answers to mark. Multiple-choice questions are marked automatically.`
            : "Short and long answers that need a teacher's marks appear here."
        }
      />

      {queue.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : queue.isError ? (
        <ErrorState title="Couldn't load the evaluation queue" onRetry={() => queue.refetch()} retrying={queue.isRefetching} />
      ) : items.length === 0 ? (
        <EmptyState icon={PartyPopper} title="All caught up" description="No submissions are waiting for marks." action={<Button variant="outline" size="sm" onClick={() => navigate("/online-exams/results")}>See results</Button>} />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.examId}>
              <Card>
                <CardContent className="flex flex-col gap-3 pt-[var(--space-card-padding)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{item.examName}</p>
                    <p className="text-sm text-muted-foreground">
                      {[item.subjectName, item.className, `Closed ${formatExamTime(item.endUtc)}`].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="warning" dot>
                        {item.attemptsPending} student{item.attemptsPending === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="neutral">
                        {item.answersPending} answer{item.answersPending === 1 ? "" : "s"} to mark
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/online-exams/exams/${item.examId}/results`)}>
                      Results
                    </Button>
                    {item.firstPendingAttemptId && (
                      <Button size="sm" onClick={() => navigate(`/online-exams/exams/${item.examId}/attempts/${item.firstPendingAttemptId}`)}>
                        Start evaluating
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
