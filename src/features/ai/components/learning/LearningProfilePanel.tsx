import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getLearningProfile, interpretLearningProfile } from "../../learning/api";
import { useAiCapabilities } from "../../capabilities";

/**
 * A learning profile in two clearly separate parts: what the school's records show (computed by fixed rules, no AI),
 * and, only when asked, the AI's reading of it with study suggestions. Parents see their own child, students
 * themselves, staff the students they may see; the server enforces all of it.
 */
export default function LearningProfilePanel({ studentId }: { studentId?: string }) {
  const { t } = useTranslation("ai");
  const { can } = useAiCapabilities();
  const profile = useQuery({ queryKey: ["ai", "learning-profile", studentId ?? "me"], queryFn: () => getLearningProfile(studentId) });
  const interpret = useMutation({ mutationFn: () => interpretLearningProfile(studentId) });

  if (profile.isLoading) return <p className="text-sm text-muted-foreground">{t("Loading learning profile…")}</p>;
  if (profile.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {profile.error.message}
      </p>
    );

  const p = profile.data!;
  const latest = p.exams.at(-1);
  const ai = interpret.data?.content;

  return (
    <div className="space-y-4">
      <section aria-label={t("What the records show")} className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("What the records show")}</h3>
          <p className="text-xs text-muted-foreground">{t("Computed by the school system from attendance, exams and homework. No AI.")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label={t("Attendance ({{days}} days)", { days: p.attendanceWindowDays })} value={p.attendancePercent === null ? "—" : `${p.attendancePercent}%`} />
          <StatCard label={t("Latest exam")} value={latest ? `${latest.percentage}%` : "—"} />
          <StatCard label={t("Change across exams")} value={p.resultsChange === null ? "—" : t("{{change}} pts", { change: `${p.resultsChange > 0 ? "+" : ""}${p.resultsChange}` })} />
          <StatCard label={t("Homework submitted")} value={p.homeworkAssigned ? `${p.homeworkSubmitted}/${p.homeworkAssigned}` : "—"} />
        </div>
        {p.observations.length > 0 ? (
          <ul className="space-y-1.5">
            {p.observations.map((o) => (
              <li key={o.text} className="flex items-start gap-2 text-sm text-secondary-foreground">
                {o.kind === "positive" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label={t("Going well")} />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-label={t("Needs attention")} />
                )}
                {o.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("Nothing stands out in the records yet.")}</p>
        )}
      </section>

      {can("learning-profile") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> {t("AI study suggestions")}
            </CardTitle>
            <CardDescription>{t("The school's AI reads the figures above and suggests what to focus on. It can make mistakes.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!ai ? (
              <Button variant="outline" onClick={() => interpret.mutate()} disabled={interpret.isPending}>
                {interpret.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {interpret.isPending ? t("Thinking…") : t("Get AI study suggestions")}
              </Button>
            ) : (
              <>
                <p className="text-foreground">{ai.summary}</p>
                {ai.strengths.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Strengths")}</h4>
                    <ul className="mt-1 list-disc space-y-0.5 ps-5 text-secondary-foreground">
                      {ai.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {ai.focusAreas.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Focus areas")}</h4>
                    <ul className="mt-1 space-y-1">
                      {ai.focusAreas.map((f) => (
                        <li key={f.area}>
                          <span className="font-medium text-foreground">{f.area}</span> <span className="text-muted-foreground">({f.evidence})</span> — {f.suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Study tips")}</h4>
                  <ul className="mt-1 list-disc space-y-0.5 ps-5 text-secondary-foreground">
                    {ai.studyTips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            {interpret.isError && (
              <p role="alert" className="text-destructive">
                {interpret.error.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
