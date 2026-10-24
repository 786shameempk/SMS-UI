import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, FileText, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { familyOverview } from "../api";
import { CHAPTER_STATUS, PROGRESS_STATUS, ProgressBar, SelectField, StatusBadge, formatDate } from "../shared";
import type { FamilyOverview, FamilySubject } from "../types";

import { useTranslation } from "react-i18next";
/** The read-only syllabus view for parents and students. Everything on it comes from a server projection that has no teacher notes in it. */
export default function FamilyPage() {
  const { t } = useTranslation("lesson-portions");
  const query = useQuery({ queryKey: ["portions", "family"], queryFn: () => familyOverview() });
  const [studentId, setStudentId] = useState<string | undefined>();
  const children = query.data ?? [];
  useEffect(() => {
    if (!studentId && children.length > 0) setStudentId(children[0].studentId);
  }, [children, studentId]);
  const child = children.find((c) => c.studentId === studentId) ?? children[0];

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />;
  if (!child) return <EmptyState icon={GraduationCap} title={t("No student linked to this login")} description={t("Ask the school office to link your child to your account.")} />;

  return (
    <div className="space-y-5">
      {children.length > 1 && (
        <div className="max-w-xs space-y-1">
          <label htmlFor="fm-child" className="text-sm font-medium">
            {t("Student")}
          </label>
          <SelectField id="fm-child" value={child.studentId} onChange={setStudentId} items={children.map((c) => ({ value: c.studentId, label: `${c.studentName} · ${c.className} ${c.sectionName}` }))} className="w-full" />
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {child.studentName} · {child.className} {child.sectionName}
      </p>
      {!child.enabled ? (
        <EmptyState icon={BookOpen} title={t("Syllabus progress isn't shown yet")} description={t("Your school hasn't turned this view on. It will appear here when they do.")} />
      ) : child.subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title={t("No syllabus published yet")} description={t("Subjects appear here once the school publishes their syllabus.")} />
      ) : (
        <Content child={child} />
      )}
    </div>
  );
}

function Content({ child }: { child: FamilyOverview }) {
  const { t } = useTranslation("lesson-portions");
  return (
    <div className="space-y-6">
      <ul className="grid gap-4 lg:grid-cols-2">
        {child.subjects.map((s) => (
          <li key={s.syllabusPlanId}>
            <SubjectCard subject={s} />
          </li>
        ))}
      </ul>

      {child.exams.length > 0 && (
        <section aria-labelledby="fm-exams" className="space-y-3">
          <h2 id="fm-exams" className="text-base font-semibold">
            {t("Exam syllabus")}
          </h2>
          {child.exams.map((e) => (
            <Card key={e.examId}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{e.examName}</h3>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(e.startDate)} – {formatDate(e.endDate)}
                  </span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {e.subjects.map((s) => (
                    <li key={s.subjectId} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium">{s.subjectName}</p>
                      {s.chapters.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{t("Chapters:")}</span> {s.chapters.join(", ")}
                        </p>
                      )}
                      {s.topics.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{t("Topics:")}</span> {s.topics.join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function SubjectCard({ subject: s }: { subject: FamilySubject }) {
  const { t: tr } = useTranslation("lesson-portions");
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{s.subjectName}</h3>
          <Badge variant="neutral">{tr("{{completedChapters}} of {{totalChapters}} chapters", { completedChapters: s.completedChapters, totalChapters: s.totalChapters })}</Badge>
        </div>
        <ProgressBar percent={s.percent} label={tr("{{subjectName}} syllabus covered {{percent}}%", { subjectName: s.subjectName, percent: s.percent })} />
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">{tr("Being taught now")}</dt>
            <dd>{s.currentTopic ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{tr("Coming up")}</dt>
            <dd>{s.upcomingTopics.length > 0 ? s.upcomingTopics.join(", ") : "—"}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          {open ? tr("Hide chapters") : tr("Show chapters")}
        </button>
        {open && (
          <ul className="space-y-3">
            {s.chapters.map((c) => (
              <li key={c.id} className="rounded-lg border border-border">
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                  <StatusBadge map={CHAPTER_STATUS} value={c.status} />
                </div>
                <ul className="divide-y divide-border">
                  {c.topics.map((t) => (
                    <li key={t.id} className="space-y-1 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1">{t.title}</span>
                        <StatusBadge map={PROGRESS_STATUS} value={t.status} />
                      </div>
                      {t.homework && (
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {tr("Homework:")} {t.homework}
                        </p>
                      )}
                      {t.resources.map((r) => (
                        <p key={r.id} className="text-xs">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              {r.title} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <span>{tr("{{title}} (in Study Materials)", { title: r.title })}</span>
                          )}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
