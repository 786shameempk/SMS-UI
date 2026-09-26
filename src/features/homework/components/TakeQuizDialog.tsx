import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listQuizAttempts, submitQuizAttempt } from "../api";
import type { Quiz } from "../types";

export default function TakeQuizDialog({
  open,
  onOpenChange,
  quiz,
  studentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
  studentId: string;
}) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<number | null>(null);

  const { data: previousAttempts = [] } = useQuery({
    queryKey: ["homework", "quiz-attempts", quiz?.id],
    queryFn: () => listQuizAttempts(quiz?.id),
    enabled: Boolean(quiz),
  });
  const myPreviousAttempts = previousAttempts.filter((a) => a.studentId === studentId);

  useEffect(() => {
    if (open) {
      setAnswers({});
      setResult(null);
    }
  }, [open, quiz?.id]);

  const submitMutation = useMutation({
    mutationFn: () => {
      const ordered = quiz!.questions.map((_, i) => answers[i]);
      return submitQuizAttempt(quiz!.id, studentId, ordered);
    },
    onSuccess: (attempt) => {
      setResult(attempt.score);
      queryClient.invalidateQueries({ queryKey: ["homework", "quiz-attempts", quiz?.id] });
      queryClient.invalidateQueries({ queryKey: ["homework", "progress"] });
      toast.success(`Quiz submitted — score ${attempt.score}%`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not submit quiz"),
  });

  if (!quiz) return null;
  const allAnswered = quiz.questions.every((_, i) => answers[i] !== undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{quiz.title}</DialogTitle>
          <DialogDescription>
            {quiz.questions.length} question(s)
            {myPreviousAttempts.length > 0 && ` · Best previous score: ${Math.max(...myPreviousAttempts.map((a) => a.score))}%`}
          </DialogDescription>
        </DialogHeader>

        {result !== null ? (
          <div className="rounded-lg border border-success/30 bg-success-soft p-4 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-success-strong mx-auto" />
            <p className="text-lg font-semibold text-success-strong">Score: {result}%</p>
            <p className="text-sm text-success-strong">Your attempt has been recorded.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quiz.questions.map((q, qIndex) => (
              <div key={q.id} className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {qIndex + 1}. {q.text}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((option, oIndex) => (
                    <label key={oIndex} className="flex items-center gap-2 text-sm text-secondary-foreground cursor-pointer">
                      <input
                        type="radio"
                        name={`take-quiz-${q.id}`}
                        className="h-3.5 w-3.5 cursor-pointer accent-brand-600"
                        checked={answers[qIndex] === oIndex}
                        onChange={() => setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }))}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {result === null && (
            <Button type="button" disabled={!allAnswered || submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit quiz
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
