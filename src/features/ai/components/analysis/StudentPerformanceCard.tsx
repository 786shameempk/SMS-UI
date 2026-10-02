import { useMutation } from "@tanstack/react-query";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Loader2, MessageCircle, RefreshCw, Sparkles, Target, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeStudentPerformance } from "../../generation/api";
import type { SubjectTrend } from "../../generation/types";

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 10) / 10}%`);

/** Change across the recent exams, with an arrow and a word so it never relies on colour alone. */
function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const steady = Math.abs(value) < 3;
  const Icon = steady ? ArrowRight : value > 0 ? ArrowUpRight : ArrowDownRight;
  const label = steady ? "steady" : value > 0 ? `up ${Math.round(value)}` : `down ${Math.round(-value)}`;
  return (
    <Badge variant={steady ? "neutral" : value > 0 ? "success" : "danger"}>
      <Icon className="mr-0.5 h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

function TrendTable({ exams, subjects }: { exams: string[]; subjects: SubjectTrend[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <caption className="sr-only">Subject results in the recent exams</caption>
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 font-medium">Subject</th>
            {exams.map((e, i) => (
              <th key={`${e}-${i}`} className="py-1 text-right font-medium">
                {e}
              </th>
            ))}
            <th className="py-1 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.subject} className="border-t border-border/70">
              <td className="py-1.5">{s.subject}</td>
              {s.percentages.map((p, i) => (
                <td key={i} className="py-1.5 text-right tabular-nums">
                  {pct(p)}
                </td>
              ))}
              <td className="py-1.5 text-right">
                <Change value={s.change} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A teacher's preparation for a parent meeting: the student's progress across exams, subject trends and attendance.
 * The numbers are computed by AiService from school records; the AI explains them and suggests talking points.
 */
export default function StudentPerformanceCard({ studentId }: { studentId: string }) {
  const analyze = useMutation({ mutationFn: () => analyzeStudentPerformance(studentId) });
  const p = analyze.data?.content;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI progress summary
          </CardTitle>
          <CardDescription>Strengths, areas to improve and talking points for a parent meeting, from this student's results and attendance.</CardDescription>
        </div>
        <Button variant={p ? "outline" : "default"} onClick={() => analyze.mutate()} disabled={analyze.isPending}>
          {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : p ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {p ? "Refresh" : "Summarise progress"}
        </Button>
      </CardHeader>

      {(analyze.isPending || analyze.isError || p) && (
        <CardContent className="space-y-5">
          {analyze.isPending && !p && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading results and attendance…
            </p>
          )}
          {analyze.isError && (
            <p role="alert" className="text-sm text-destructive">
              {analyze.error.message}
            </p>
          )}

          {p && (
            <>
              <p className="text-sm leading-6" aria-label="Summary">
                {p.summary}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <section className="space-y-2" aria-label="Strengths">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <ThumbsUp className="h-4 w-4 text-success-strong" /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {p.strengths.map((s) => (
                      <li key={s.area} className="rounded-lg border border-border/80 px-3 py-2 text-sm">
                        <p className="font-medium">{s.area}</p>
                        <p className="text-muted-foreground">{s.evidence}</p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="space-y-2" aria-label="Areas to improve">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Target className="h-4 w-4 text-warning-strong" /> Areas to improve
                  </h3>
                  {p.areasToImprove.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing stands out in these results.</p>
                  ) : (
                    <ul className="space-y-2">
                      {p.areasToImprove.map((a) => (
                        <li key={a.area} className="rounded-lg border border-border/80 px-3 py-2 text-sm">
                          <p className="font-medium">{a.area}</p>
                          <p className="text-muted-foreground">{a.evidence}</p>
                          <p className="mt-1">{a.suggestion}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {p.talkingPoints.length > 0 && (
                <section className="space-y-2" aria-label="Talking points">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <MessageCircle className="h-4 w-4 text-primary" /> Talking points for the family
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {p.talkingPoints.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </section>
              )}

              {p.subjects.length > 0 && (
                <section className="space-y-2" aria-label="Subject trends">
                  <h3 className="text-sm font-semibold">Subjects in the recent exams</h3>
                  <TrendTable exams={p.recentExamNames} subjects={p.subjects} />
                </section>
              )}

              <p className="text-xs text-muted-foreground">
                {p.attendancePercent === null
                  ? "Attendance was not available."
                  : `Attendance over the last 90 days: ${pct(p.attendancePercent)} of ${p.attendanceDays} marked days.`}{" "}
                AI generated from {p.exams.length} exam{p.exams.length === 1 ? "" : "s"}; the numbers are calculated by the system. Check before sharing.
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
