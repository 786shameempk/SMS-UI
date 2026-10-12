import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { CalendarClock, CircleCheck, EyeOff, FileText, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { listExams } from "@/features/examinations/api";
import { examCoverage, examRevisionPlan, getExamPortions, getSyllabus, listSyllabi, publishExamPortions, setExamPortions, unpublishExamPortions } from "../api";
import { Panel } from "../components/bits";
import { ProgressBar, SelectField, formatDate, formatDay, usePortionAccess, useApiMutation, useReferenceData, PROGRESS_STATUS, StatusBadge } from "../shared";
import type { ExamCoverage, ExamPortionInput } from "../types";

const keyOf = (subjectId: string, chapterId: string, topicId?: string | null) => `${subjectId}|${chapterId}|${topicId ?? ""}`;

export default function ExamPortionsPage() {
  const access = usePortionAccess();
  const data = useReferenceData();
  const exams = useQuery({ queryKey: ["portions", "exams"], queryFn: listExams });
  const [examId, setExamId] = useState<string | undefined>();
  const exam = exams.data?.find((e) => e.id === examId);
  const className = (id: string) => data.classes.find((c) => c.id === id)?.name ?? "";

  if (exams.isError) return <ErrorState onRetry={() => exams.refetch()} retrying={exams.isFetching} />;
  const sorted = [...(exams.data ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="space-y-5">
      <div className="max-w-xl space-y-1">
        <label htmlFor="ep-exam" className="text-sm font-medium">
          Examination
        </label>
        <SelectField id="ep-exam" value={examId} onChange={setExamId} placeholder={exams.isLoading ? "Loading…" : "Choose an examination"} items={sorted.map((e) => ({ value: e.id, label: `${e.name} · ${className(e.classId)} · ${formatDate(e.startDate)}` }))} className="w-full" />
      </div>
      {!exam ? (
        <EmptyState icon={FileText} title="Choose an examination" description="Pick the chapters and topics it covers, publish them to students and parents, and see which of them have not been taught yet." />
      ) : (
        <ExamEditor key={exam.id} examId={exam.id} classId={exam.classId} examName={exam.name} startDate={exam.startDate} canEdit={access.canManage || access.canApprove} />
      )}
    </div>
  );
}

function ExamEditor({ examId, classId, examName, startDate, canEdit }: { examId: string; classId: string; examName: string; startDate: string; canEdit: boolean }) {
  const portions = useQuery({ queryKey: ["portions", "exam-portions", examId], queryFn: () => getExamPortions(examId) });
  const syllabi = useQuery({ queryKey: ["portions", "syllabi", "for-exam", classId], queryFn: () => listSyllabi({ classId, status: "Published", pageSize: 100 }) });
  const details = useQueries({ queries: (syllabi.data?.items ?? []).map((s) => ({ queryKey: ["portions", "syllabus", s.id], queryFn: () => getSyllabus(s.id) })) });
  const coverage = useQuery({ queryKey: ["portions", "exam-coverage", examId], queryFn: () => examCoverage(examId) });
  const [chosen, setChosen] = useState<Map<string, ExamPortionInput>>(new Map());
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState<ExamCoverage | null>(null);

  const published = portions.data?.isPublished ?? false;
  useEffect(() => {
    if (!portions.data) return;
    setChosen(new Map(portions.data.portions.map((p) => [keyOf(p.subjectId, p.syllabusChapterId, p.syllabusTopicId), { subjectId: p.subjectId, syllabusChapterId: p.syllabusChapterId, syllabusTopicId: p.syllabusTopicId, note: p.note ?? undefined }])));
    setDirty(false);
  }, [portions.data]);

  const invalidate = [["portions", "exam-portions", examId], ["portions", "exam-coverage", examId], ["portions", "exam-coverage-report"]];
  const save = useApiMutation(() => setExamPortions(examId, [...chosen.values()]), { success: "Examination portions saved", invalidate });
  const publish = useApiMutation(() => publishExamPortions(examId), { success: "Published to students and parents", invalidate });
  const unpublish = useApiMutation(() => unpublishExamPortions(examId), { success: "Unpublished", invalidate });

  const toggle = (subjectId: string, chapterId: string, topicId: string | null, on: boolean, siblings: string[] = []) => {
    if (published || !canEdit) return;
    setDirty(true);
    setChosen((cur) => {
      const next = new Map(cur);
      if (topicId === null) {
        // Whole chapter: drop its separate topic rows and add or remove the chapter row.
        for (const t of siblings) next.delete(keyOf(subjectId, chapterId, t));
        if (on) next.set(keyOf(subjectId, chapterId), { subjectId, syllabusChapterId: chapterId, syllabusTopicId: null });
        else next.delete(keyOf(subjectId, chapterId));
      } else {
        // A single topic: the whole-chapter row, if any, becomes the other topics.
        const whole = next.has(keyOf(subjectId, chapterId));
        if (whole) {
          next.delete(keyOf(subjectId, chapterId));
          for (const t of siblings) next.set(keyOf(subjectId, chapterId, t), { subjectId, syllabusChapterId: chapterId, syllabusTopicId: t });
        }
        if (on) next.set(keyOf(subjectId, chapterId, topicId), { subjectId, syllabusChapterId: chapterId, syllabusTopicId: topicId });
        else next.delete(keyOf(subjectId, chapterId, topicId));
      }
      return next;
    });
  };

  const loading = portions.isLoading || syllabi.isLoading || details.some((d) => d.isLoading);
  const subjects = useMemo(() => details.map((d) => d.data).filter((d): d is NonNullable<typeof d> => Boolean(d)), [details]);

  return (
    <div className="space-y-5">
      <Panel
        title={`What ${examName} covers`}
        description={published ? "Published: students and parents can see these portions (if your school shows exam syllabus to families). Unpublish to change them." : "Choose the chapters and topics. Only a published syllabus is shown to students and parents."}
        actions={
          canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              {published ? (
                <Button size="sm" variant="outline" onClick={() => unpublish.mutate(undefined)} loading={unpublish.isPending}>
                  <EyeOff className="h-4 w-4" /> Unpublish
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => save.mutate(undefined)} loading={save.isPending} disabled={!dirty}>
                    Save portions
                  </Button>
                  <Button size="sm" onClick={() => publish.mutate(undefined)} loading={publish.isPending} disabled={dirty || chosen.size === 0}>
                    <Send className="h-4 w-4" /> Publish
                  </Button>
                </>
              )}
            </div>
          )
        }
        loading={loading}
        error={portions.isError || syllabi.isError}
        onRetry={() => { portions.refetch(); syllabi.refetch(); }}
        empty={!loading && subjects.length === 0 ? { icon: FileText, title: "No published syllabus for this class", description: "Publish a syllabus for the class's subjects first; its chapters and topics are what you choose from." } : null}
      >
        <div className="space-y-4">
          {published && <Badge variant="success">Published {formatDate(portions.data?.publishedAt?.slice(0, 10))}</Badge>}
          {dirty && !published && <p className="text-xs text-warning-strong">You have unsaved changes. Save before publishing.</p>}
          {subjects.map((s) => (
            <section key={s.summary.id} className="rounded-lg border border-border">
              <h3 className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold">{s.summary.subjectName}</h3>
              <div className="space-y-2 p-3">
                {s.chapters.map((c) => {
                  const parents = new Set(c.topics.map((t) => t.parentTopicId).filter(Boolean));
                  const leaves = c.topics.filter((t) => !parents.has(t.id));
                  const leafIds = leaves.map((t) => t.id);
                  const whole = chosen.has(keyOf(s.summary.subjectId, c.id));
                  const some = whole || leaves.some((t) => chosen.has(keyOf(s.summary.subjectId, c.id, t.id)));
                  return (
                    <div key={c.id} className="space-y-1">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox disabled={published || !canEdit} checked={whole ? true : some ? "indeterminate" : false} onCheckedChange={(v) => toggle(s.summary.subjectId, c.id, null, v === true, leafIds)} aria-label={`Whole chapter ${c.title}`} />
                        {c.title}
                      </label>
                      <div className="grid gap-1 pl-6 sm:grid-cols-2">
                        {leaves.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-sm">
                            <Checkbox disabled={published || !canEdit} checked={whole || chosen.has(keyOf(s.summary.subjectId, c.id, t.id))} onCheckedChange={(v) => toggle(s.summary.subjectId, c.id, t.id, v === true, leafIds)} aria-label={t.title} />
                            <span className="truncate">{t.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Panel>

      <Panel
        title="Have these been taught?"
        description={`Topics in the portions that are not yet completed in every section of the class, before ${formatDate(startDate)}.`}
        loading={coverage.isLoading}
        error={coverage.isError}
        onRetry={() => coverage.refetch()}
        empty={coverage.data && coverage.data.length === 0 ? { icon: CalendarClock, title: "No portions set yet", description: "Choose chapters and topics above to see how much has been taught." } : null}
      >
        <ul className="space-y-4">
          {coverage.data?.map((c) => (
            <li key={c.subjectId} className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-32 shrink-0 font-medium">{c.subjectName}</span>
                <ProgressBar percent={c.coveragePercent} risk={c.untaught.length === 0 ? "Complete" : c.coveragePercent < 50 ? "Behind" : "AtRisk"} className="min-w-48 flex-1" />
                <span className="text-xs text-muted-foreground">{c.taughtTopics} of {c.portionTopics} taught</span>
                {c.untaught.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setRevision(c)}>
                    Revision plan
                  </Button>
                )}
              </div>
              {c.untaught.length === 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-success-strong">
                  <CircleCheck className="h-4 w-4" aria-hidden="true" /> Everything in this portion has been taught.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {c.untaught.map((u) => (
                    <li key={u.topicId} className="flex flex-wrap items-center gap-2 px-3 py-1.5">
                      <span className="min-w-0 flex-1">
                        {u.topicTitle}
                        <span className="block text-xs text-muted-foreground">{u.chapterTitle}{u.sectionName ? ` · still to do in ${u.sectionName}` : ""}</span>
                      </span>
                      <StatusBadge map={PROGRESS_STATUS} value={u.status} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <RevisionDialog examId={examId} coverage={revision} onClose={() => setRevision(null)} />
    </div>
  );
}

function RevisionDialog({ examId, coverage, onClose }: { examId: string; coverage: ExamCoverage | null; onClose: () => void }) {
  const query = useQuery({ queryKey: ["portions", "revision-plan", examId, coverage?.subjectId], queryFn: () => examRevisionPlan(examId, coverage!.subjectId), enabled: Boolean(coverage) });
  const d = query.data;
  return (
    <Dialog open={Boolean(coverage)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Revision plan · {coverage?.subjectName}</DialogTitle>
          <DialogDescription>A suggested order for revising what has been taught, on the teaching days left before the exam. It is a suggestion for the teacher; it doesn't change any plan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto">
          {query.isLoading && <Skeleton className="h-24 w-full" />}
          {query.isError && <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />}
          {d && (
            <>
              <p className="text-sm">{d.summary}</p>
              {d.items.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {d.items.map((i, idx) => (
                    <li key={`${i.topicId}-${idx}`} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">{formatDay(i.date)}</span>
                      <span className="min-w-0 flex-1 truncate">{i.topicTitle}</span>
                      <span className="text-xs text-muted-foreground">{i.periods}p</span>
                    </li>
                  ))}
                </ul>
              )}
              {d.unscheduled.length > 0 && <p className="text-xs text-destructive-strong">To teach first, or does not fit: {d.unscheduled.join(", ")}</p>}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
