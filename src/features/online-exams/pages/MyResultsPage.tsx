import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, ChevronRight, Hourglass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { listMyExams } from "../api";
import { EXAM_TYPE_LABEL, formatExamTime, isExamStudent } from "../constants";

export default function MyResultsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const exams = useQuery({ queryKey: ["online-exams", "my"], queryFn: listMyExams, enabled: isExamStudent(role) });

  if (!isExamStudent(role)) return <Navigate to="/online-exams/results" replace />;

  const submitted = (exams.data ?? []).filter((e) => e.attemptsUsed > 0).sort((a, b) => Date.parse(b.lastSubmittedAt ?? b.endUtc) - Date.parse(a.lastSubmittedAt ?? a.endUtc));
  const ready = submitted.filter((e) => e.resultAvailable);
  const waiting = submitted.filter((e) => !e.resultAvailable);

  return (
    <PageContainer>
      <PageHeader icon={Award} title="My results" description="Your marks for submitted exams. Results appear once your teacher publishes them." />
      {exams.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : exams.isError ? (
        <ErrorState title="Couldn't load your results" onRetry={() => exams.refetch()} retrying={exams.isRefetching} />
      ) : submitted.length === 0 ? (
        <EmptyState icon={Award} title="No results yet" description="Once you submit an exam and the results are published, they'll show here." />
      ) : (
        <div className="space-y-3">
          {ready.map((e) => (
            <button key={e.id} type="button" onClick={() => navigate(`/online-exams/my/${e.id}/result`)} className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success-strong">
                    <Award className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">{e.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[e.subjectName, EXAM_TYPE_LABEL[e.examType], e.lastSubmittedAt && `Submitted ${formatExamTime(e.lastSubmittedAt)}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="hidden text-sm font-medium text-primary sm:inline">View result</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </button>
          ))}
          {waiting.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <Hourglass className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-foreground">{e.name}</span>
                  <span className="block text-sm text-muted-foreground">{e.subjectName ?? "Exam"} · Waiting for your teacher to publish results</span>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
