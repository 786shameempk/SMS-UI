import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/utils/format";
import { QUESTION_TYPE_CONFIG, SURVEY_STATUS_CONFIG } from "../constants";
import { deleteResponse, getSurveyResults, listResponses } from "../api";
import type { QuestionResult } from "../types";

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-secondary-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuestionResultCard({ result }: { result: QuestionResult }) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{result.questionText}</p>
        <Badge variant="info" className="shrink-0">
          {QUESTION_TYPE_CONFIG[result.type].label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{result.answeredCount} response{result.answeredCount === 1 ? "" : "s"}</p>

      {result.type === "rating" && result.ratingDistribution && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            {result.ratingAverage ?? 0} average
          </p>
          {result.ratingDistribution.map((d) => (
            <Bar key={d.value} label={`${d.value} star${d.value === 1 ? "" : "s"}`} count={d.count} total={result.answeredCount} />
          ))}
        </div>
      )}

      {result.type === "multiple_choice" && result.choiceCounts && (
        <div className="space-y-2">
          {result.choiceCounts.map((c) => (
            <Bar key={c.option} label={c.option} count={c.count} total={result.answeredCount} />
          ))}
        </div>
      )}

      {result.type === "yes_no" && (
        <div className="space-y-2">
          <Bar label="Yes" count={result.yesCount ?? 0} total={result.answeredCount} />
          <Bar label="No" count={result.noCount ?? 0} total={result.answeredCount} />
        </div>
      )}

      {result.type === "text" && (
        <div className="space-y-1.5">
          {(result.textResponses ?? []).length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
          {result.textResponses?.map((text, i) => (
            <p key={i} className="text-sm text-foreground rounded-md bg-secondary/50 px-2.5 py-1.5">
              "{text}"
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SurveyResultsDialog({ surveyId, open, onOpenChange }: { surveyId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: summary } = useQuery({ queryKey: ["surveys", "results", surveyId], queryFn: () => getSurveyResults(surveyId!), enabled: Boolean(surveyId) && open });
  const { data: respondents = [] } = useQuery({ queryKey: ["surveys", "responses", surveyId], queryFn: () => listResponses(surveyId!), enabled: Boolean(surveyId) && open });

  const deleteMutation = useMutation({
    mutationFn: deleteResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Response deleted");
    },
  });

  if (!summary) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading…</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {summary.survey.title}
            <Badge variant={SURVEY_STATUS_CONFIG[summary.survey.status].variant}>{SURVEY_STATUS_CONFIG[summary.survey.status].label}</Badge>
          </DialogTitle>
          <DialogDescription>{summary.responseCount} response{summary.responseCount === 1 ? "" : "s"} collected.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            {summary.questionResults.map((result) => (
              <QuestionResultCard key={result.questionId} result={result} />
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Respondents</p>
            {respondents.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
            {respondents.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{r.respondentLabel}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.submittedAt)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteMutation.mutate(r.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive-strong" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
