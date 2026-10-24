import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { appealProctoringDecision, getMyProctoringReview } from "./api";
import { useTranslation } from "react-i18next";

/** The student's proctoring decision, if a teacher made one, and the way to appeal it. Hidden when there is nothing decided. */
export default function MyProctoringReview({ examId }: { examId: string }) {
  const { t } = useTranslation("online-exams");
  const queryClient = useQueryClient();
  const review = useQuery({ queryKey: ["online-exams", "my-proctoring", examId], queryFn: () => getMyProctoringReview(examId), retry: false });
  const [text, setText] = useState("");
  const appeal = useMutation({
    mutationFn: () => appealProctoringDecision(examId, text),
    onSuccess: () => {
      toast.success(t("Appeal sent"));
      queryClient.invalidateQueries({ queryKey: ["online-exams", "my-proctoring", examId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const r = review.data;
  if (!r || (r.outcome !== "Warning" && r.outcome !== "Misconduct" && r.appealStatus === "None")) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Proctoring review")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          {t("Your teacher recorded:")} <strong>{r.outcome === "Misconduct" ? t("misconduct") : r.outcome === "Warning" ? t("a warning") : t("no issue")}</strong>
          {r.reviewNote ? ` - “${r.reviewNote}”` : ""}
        </p>
        {r.appealStatus === "None" ? (
          <>
            <p className="text-muted-foreground">{t("If something else explains what was recorded (a system prompt, a power cut, a shared device), tell your teacher.")}</p>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder={t("What happened")} aria-label={t("Appeal")} />
            <Button onClick={() => appeal.mutate()} disabled={!text.trim() || appeal.isPending}>
              {t("Send appeal")}
            </Button>
          </>
        ) : (
          <p className="rounded-md border border-border px-3 py-2">
            {t("Your appeal:")} {r.appealStatus === "Open" ? t("waiting for a decision") : r.appealStatus === "Upheld" ? t("accepted") : t("not accepted")}
            {r.appealDecisionNote ? ` - “${r.appealDecisionNote}”` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
