import { useMutation } from "@tanstack/react-query";
import { BookOpenCheck, Lightbulb, Loader2, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { analyzeOnlineExam } from "../../generation/api";

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/**
 * AI reading of an online exam's question statistics. The numbers (topic averages) come from AiService's own
 * calculation; the model only explains them, and it never sees student-level data.
 */
export default function ExamInsightsCard({ examId }: { examId: string }) {
  const analyze = useMutation({ mutationFn: () => analyzeOnlineExam(examId) });
  const insights = analyze.data?.content;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI insights
          </CardTitle>
          <CardDescription>Which concepts the class found hard and what to revise, explained from the statistics below.</CardDescription>
        </div>
        <Button variant={insights ? "outline" : "default"} onClick={() => analyze.mutate()} disabled={analyze.isPending}>
          {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : insights ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {insights ? "Refresh" : "Explain with AI"}
        </Button>
      </CardHeader>

      {(analyze.isPending || analyze.isError || insights) && (
        <CardContent className="space-y-5">
          {analyze.isPending && !insights && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading the question statistics…
            </p>
          )}
          {analyze.isError && (
            <p role="alert" className="text-sm text-destructive">
              {analyze.error.message}
            </p>
          )}

          {insights && (
            <>
              <p className="text-sm leading-6" aria-label="Summary">
                {insights.summary}
              </p>

              {insights.difficultConcepts.length > 0 && (
                <section className="space-y-2" aria-label="Difficult concepts">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <TriangleAlert className="h-4 w-4 text-warning-strong" /> Difficult concepts
                  </h3>
                  <ul className="space-y-2">
                    {insights.difficultConcepts.map((c) => (
                      <li key={c.concept} className="rounded-lg border border-border/80 px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{c.concept}</span>
                          {c.questionNumbers.map((n) => (
                            <Badge key={n} variant="neutral">
                              Q{n}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-0.5 text-muted-foreground">{c.evidence}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="space-y-2" aria-label="What to revise">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <BookOpenCheck className="h-4 w-4 text-primary" /> What to revise
                </h3>
                <ul className="space-y-2">
                  {insights.revisionTopics.map((t) => (
                    <li key={t.topic} className="rounded-lg border border-border/80 px-3 py-2 text-sm">
                      <p className="font-medium">{t.topic}</p>
                      <p className="text-muted-foreground">{t.reason}</p>
                      <p className="mt-1">{t.suggestion}</p>
                    </li>
                  ))}
                </ul>
              </section>

              {insights.teachingSuggestions.length > 0 && (
                <section className="space-y-2" aria-label="Teaching ideas">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Lightbulb className="h-4 w-4 text-primary" /> Teaching ideas
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {insights.teachingSuggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </section>
              )}

              {insights.topics.length > 0 && (
                <section className="space-y-2" aria-label="Results by topic">
                  <h3 className="text-sm font-semibold">Results by topic</h3>
                  <Table density="compact">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead className="text-right">Average correct</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insights.topics.map((t) => (
                        <TableRow key={t.topic}>
                          <TableCell>{t.topic}</TableCell>
                          <TableCell className="text-muted-foreground">{t.questionNumbers.map((n) => `Q${n}`).join(", ")}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <Badge variant={t.averageCorrect < 40 ? "danger" : t.averageCorrect < 60 ? "warning" : "success"}>{pct(t.averageCorrect)}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}

              <p className="text-xs text-muted-foreground">
                AI generated from {insights.studentsSubmitted} submission{insights.studentsSubmitted === 1 ? "" : "s"}. The percentages are calculated by the system; check the suggestions against your own judgement.
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
