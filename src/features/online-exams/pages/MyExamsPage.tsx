import i18n from "@/i18n";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, CalendarClock, CheckCircle2, Clock, FileText, MonitorCheck, PlayCircle, RotateCcw } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { listMyExams } from "../api";
import { EXAM_TYPE_LABEL, formatDuration, formatExamTime, formatMarks, isExamStudent, MY_STATE_LABEL } from "../constants";
import type { MyOnlineExam } from "../types";
import { Trans, useTranslation } from "react-i18next";

type View = "all" | "upcoming" | "completed";

const isLive = (e: MyOnlineExam) => e.canStart || e.myState === "InProgress";
const isUpcoming = (e: MyOnlineExam) => !isLive(e) && e.myState === "NotStarted" && e.status === "Scheduled";
const isDone = (e: MyOnlineExam) => !isLive(e) && !isUpcoming(e);

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function relative(ms: number) {
  const t = (key: string, values?: Record<string, number>) => i18n.t(key, { ns: "online-exams", ...values });
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 1) return t("less than a minute");
  if (mins < 60) return t("{{m}} min", { m: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 48) return mins % 60 ? t("{{h}} h {{m}} min", { h: hours, m: mins % 60 }) : t("{{h}} h", { h: hours });
  return t("{{d}} days", { d: Math.round(hours / 24) });
}

const STATE_TONE: Record<MyOnlineExam["myState"], BadgeVariant> = { NotStarted: "info", InProgress: "warning", Submitted: "success", Missed: "neutral" };

function ExamCard({ exam, now, onStart }: { exam: MyOnlineExam; now: number; onStart: (e: MyOnlineExam) => void }) {
  const { t } = useTranslation("online-exams");
  const navigate = useNavigate();
  const live = isLive(exam);
  const opensIn = Date.parse(exam.startUtc) - now;
  const closesIn = Date.parse(exam.endUtc) - now;
  const cancelled = exam.status === "Cancelled";

  return (
    <Card className={live ? "border-primary/40 ring-1 ring-primary/15" : undefined}>
      <CardContent className="flex h-full flex-col gap-3 pt-[var(--space-card-padding)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {exam.subjectName ?? t("Exam")} · {t(EXAM_TYPE_LABEL[exam.examType])}
            </p>
            <h3 className="mt-0.5 font-semibold text-foreground">{exam.name}</h3>
          </div>
          {cancelled ? (
            <Badge variant="neutral">{t("Cancelled")}</Badge>
          ) : live && exam.myState !== "InProgress" ? (
            <Badge variant="danger" dot>
              {t("Open now")}
            </Badge>
          ) : (
            <Badge variant={STATE_TONE[exam.myState]} dot>
              {t(MY_STATE_LABEL[exam.myState])}
            </Badge>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-secondary/60 px-2.5 py-2">
            <dt className="text-xs text-muted-foreground">{t("Duration")}</dt>
            <dd className="font-medium">{formatDuration(exam.durationMinutes)}</dd>
          </div>
          <div className="rounded-lg bg-secondary/60 px-2.5 py-2">
            <dt className="text-xs text-muted-foreground">{t("Questions")}</dt>
            <dd className="font-medium tabular-nums">{exam.questionCount}</dd>
          </div>
          <div className="rounded-lg bg-secondary/60 px-2.5 py-2">
            <dt className="text-xs text-muted-foreground">{t("Marks")}</dt>
            <dd className="font-medium tabular-nums">{formatMarks(exam.totalMarks)}</dd>
          </div>
        </dl>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4 shrink-0" />
          {formatExamTime(exam.startUtc)} – {formatExamTime(exam.endUtc)}
        </p>
        {live && closesIn > 0 && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-warning-strong">
            <Clock className="h-4 w-4" />
            {t("Closes in {{time}}", { time: relative(closesIn) })}
          </p>
        )}
        {isUpcoming(exam) && opensIn > 0 && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-info-strong">
            <Clock className="h-4 w-4" />
            {t("Opens in {{time}}", { time: relative(opensIn) })}
          </p>
        )}
        {exam.maxAttempts > 1 && (
          <p className="text-xs text-muted-foreground">
            {t("Attempts used: {{used}} of {{max}}", { used: exam.attemptsUsed, max: exam.maxAttempts })}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {exam.myState === "InProgress" ? (
            <Button onClick={() => navigate(`/online-exams/take/${exam.id}`)}>
              <PlayCircle className="h-4 w-4" />
              {t("Resume exam")}
            </Button>
          ) : exam.canStart ? (
            <Button onClick={() => onStart(exam)}>
              {exam.attemptsUsed > 0 ? <RotateCcw className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              {exam.attemptsUsed > 0 ? t("Try again") : t("Start exam")}
            </Button>
          ) : null}
          {exam.resultAvailable && (
            <Button variant="outline" onClick={() => navigate(`/online-exams/my/${exam.id}/result`)}>
              <Award className="h-4 w-4" />
              {t("View result")}
            </Button>
          )}
          {exam.myState === "Submitted" && !exam.resultAvailable && !exam.canStart && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {t("Submitted - results will appear once published")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, exams, now, onStart }: { title: string; exams: MyOnlineExam[]; now: number; onStart: (e: MyOnlineExam) => void }) {
  if (!exams.length) return null;
  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} <span className="tabular-nums">({exams.length})</span>
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exams.map((e) => (
          <ExamCard key={e.id} exam={e} now={now} onStart={onStart} />
        ))}
      </div>
    </section>
  );
}

const TITLES: Record<View, { title: string; description: string }> = {
  all: { title: "My exams", description: "Online exams assigned to you. Open ones can be started right away." },
  upcoming: { title: "Upcoming exams", description: "Exams that are open now or scheduled for later." },
  completed: { title: "Completed exams", description: "Exams you've submitted or that have closed." },
};

export default function MyExamsPage({ view }: { view: View }) {
  const { t } = useTranslation("online-exams");
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const now = useNow();
  const [confirm, setConfirm] = useState<MyOnlineExam | null>(null);
  const exams = useQuery({ queryKey: ["online-exams", "my"], queryFn: listMyExams, enabled: isExamStudent(role), refetchInterval: 60_000 });

  if (!isExamStudent(role)) return <Navigate to="/online-exams" replace />;

  const list = exams.data ?? [];
  const live = list.filter(isLive);
  const upcoming = list.filter(isUpcoming);
  const done = list.filter(isDone).sort((a, b) => Date.parse(b.endUtc) - Date.parse(a.endUtc));
  const shown = view === "all" ? list : view === "upcoming" ? [...live, ...upcoming] : done;

  return (
    <PageContainer>
      <PageHeader icon={MonitorCheck} title={t(TITLES[view].title)} description={t(TITLES[view].description)} />

      {exams.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : exams.isError ? (
        <ErrorState title={t("Couldn't load your exams")} description={exams.error instanceof Error ? exams.error.message : undefined} onRetry={() => exams.refetch()} retrying={exams.isRefetching} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={view === "completed" ? t("Nothing completed yet") : view === "upcoming" ? t("No upcoming exams") : t("No exams assigned yet")}
          description={view === "completed" ? t("Exams you submit appear here.") : t("When a teacher schedules an exam for you, it appears here and you get a notification.")}
        />
      ) : (
        <div className="space-y-6">
          {view !== "completed" && <Section title={t("Open now")} exams={live} now={now} onStart={setConfirm} />}
          {view !== "completed" && <Section title={t("Upcoming")} exams={upcoming} now={now} onStart={setConfirm} />}
          {view !== "upcoming" && <Section title={t("Completed")} exams={done} now={now} onStart={setConfirm} />}
        </div>
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Start {{name}}?", { name: confirm?.name })}</DialogTitle>
            <DialogDescription>{t("The timer starts as soon as you begin and keeps running even if you close the page.")}</DialogDescription>
          </DialogHeader>
          {confirm && (
            <div className="space-y-3 text-sm">
              <ul className="space-y-1.5 rounded-xl bg-secondary/60 px-4 py-3">
                <li>
                  <Trans
                    t={t}
                    i18nKey={confirm.questionCount === 1 ? (confirm.totalMarks === 1 ? "<0>{{duration}}</0> to answer <1>{{n}}</1> question ({{marks}} mark)" : "<0>{{duration}}</0> to answer <1>{{n}}</1> question ({{marks}} marks)") : confirm.totalMarks === 1 ? "<0>{{duration}}</0> to answer <1>{{n}}</1> questions ({{marks}} mark)" : "<0>{{duration}}</0> to answer <1>{{n}}</1> questions ({{marks}} marks)"}
                    values={{ duration: formatDuration(confirm.durationMinutes), n: confirm.questionCount, marks: formatMarks(confirm.totalMarks) }}
                    components={[<strong key="d" />, <strong key="n" />]}
                  />
                </li>
                <li>{t("Answers save automatically as you go.")}</li>
                <li>{t("When time runs out, your answers are submitted for you.")}</li>
                {confirm.maxAttempts > 1 && <li>{t("This is attempt {{n}} of {{max}}.", { n: confirm.attemptsUsed + 1, max: confirm.maxAttempts })}</li>}
              </ul>
              {confirm.description && <p className="whitespace-pre-wrap text-muted-foreground">{confirm.description}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t("Not yet")}
            </Button>
            <Button onClick={() => confirm && navigate(`/online-exams/take/${confirm.id}`, { state: { start: true } })}>
              <PlayCircle className="h-4 w-4" />
              {t("Start now")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
