import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { getLessonPlan, planCalendar, rescheduleLessonPlan } from "../api";
import { FilterBar, PROGRESS_STATUS, StatusBadge, addDays, formatDay, mondayOf, todayIso, toIso, useApiMutation, usePortionAccess, useReferenceData } from "../shared";
import type { CalendarDay, CalendarLesson, PortionFilters } from "../types";

import { useTranslation } from "react-i18next";
type View = "week" | "month";

function rangeFor(view: View, anchor: string): { from: string; to: string; label: string } {
  if (view === "week") {
    const from = mondayOf(anchor);
    const to = addDays(from, 6);
    return { from, to, label: `${formatDay(from)} – ${formatDay(to)}` };
  }
  const d = new Date(`${anchor}T00:00:00`);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: toIso(first), to: toIso(last), label: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
}

const step = (view: View, anchor: string, dir: 1 | -1) => {
  if (view === "week") return addDays(anchor, 7 * dir);
  const d = new Date(`${anchor}T00:00:00`);
  return toIso(new Date(d.getFullYear(), d.getMonth() + dir, 1));
};

export default function PlanCalendarPage() {
  const { t } = useTranslation("lesson-portions");
  const access = usePortionAccess();
  const data = useReferenceData({ teachers: access.seesAll });
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(todayIso());
  const [filters, setFilters] = useState<PortionFilters>({});
  const [move, setMove] = useState<CalendarLesson | null>(null);
  const { from, to, label } = rangeFor(view, anchor);

  const query = useQuery({
    queryKey: ["portions", "calendar", from, to, filters.classId, filters.sectionId, filters.subjectId, filters.staffId],
    queryFn: () => planCalendar(from, to, { classId: filters.classId, sectionId: filters.sectionId, subjectId: filters.subjectId, staffId: filters.staffId }),
    placeholderData: (p) => p,
  });
  const days = query.data ?? [];
  const lessonCount = days.reduce((n, d) => n + d.lessons.length, 0);
  const canMove = access.canPlan || access.canApprove;

  // Month view pads the first week so days line up under their weekday.
  const padded = useMemo(() => {
    if (view !== "month" || days.length === 0) return days;
    const lead = (new Date(`${days[0].date}T00:00:00`).getDay() + 6) % 7;
    return [...Array<null>(lead).fill(null), ...days] as Array<CalendarDay | null>;
  }, [days, view]);

  return (
    <div className="space-y-4">
      <FilterBar value={filters} onChange={setFilters} data={data} show={access.seesAll ? ["class", "section", "subject", "teacher"] : ["class", "section", "subject"]} className="lg:grid-cols-4" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="outline" aria-label={t("Previous")} onClick={() => setAnchor(step(view, anchor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAnchor(todayIso())}>
            {t("Today")}
          </Button>
          <Button size="icon-sm" variant="outline" aria-label={t("Next")} onClick={() => setAnchor(step(view, anchor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ms-2 text-base font-semibold" aria-live="polite">
            {label}
          </h2>
        </div>
        <SegmentedControl<View> aria-label={t("Calendar view")} value={view} onValueChange={setView} options={[{ value: "week", label: t("Week") }, { value: "month", label: t("Month") }]} />
      </div>

      {query.isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : (
        <>
          {lessonCount === 0 && <EmptyState icon={CalendarDays} title={t("No lessons planned in this period")} description={t("Lessons appear on the dates set in lesson plans. Holidays and examination days from the school calendar are marked.")} />}

          {/* Desktop: a grid of days. */}
          <div className="hidden md:block">
            <div className={view === "week" ? "grid grid-cols-6 gap-2 lg:grid-cols-7" : "grid grid-cols-7 gap-2"}>
              {view === "month" && ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                <div key={w} className="px-1 text-xs font-medium text-muted-foreground">
                  {w}
                </div>
              ))}
              {(view === "month" ? padded : days).map((day, i) =>
                day ? <DayCell key={day.date} day={day} compact={view === "month"} canMove={canMove} onMove={setMove} /> : <div key={`pad-${i}`} aria-hidden="true" />,
              )}
            </div>
          </div>

          {/* Phones: one list, only days with something on them. */}
          <ol className="space-y-2 md:hidden">
            {days
              .filter((d) => d.lessons.length > 0 || d.noTeachingReason)
              .map((day) => (
                <li key={day.date}>
                  <DayCell day={day} canMove={canMove} onMove={setMove} />
                </li>
              ))}
          </ol>
        </>
      )}

      <MoveDialog lesson={move} onClose={() => setMove(null)} />
    </div>
  );
}

function DayCell({ day, compact, canMove, onMove }: { day: CalendarDay; compact?: boolean; canMove: boolean; onMove: (l: CalendarLesson) => void }) {
  const { t } = useTranslation("lesson-portions");
  const isToday = day.date === todayIso();
  const off = Boolean(day.noTeachingReason);
  const shown = compact ? day.lessons.slice(0, 3) : day.lessons;
  return (
    <section
      aria-label={formatDay(day.date)}
      className={`min-h-24 rounded-lg border p-2 text-xs ${isToday ? "border-primary ring-1 ring-primary/40" : "border-border"} ${off ? "bg-muted/50" : "bg-card"}`}
    >
      <header className="mb-1 flex items-center justify-between gap-1">
        <span className={`font-medium ${isToday ? "text-primary" : ""}`}>{compact ? new Date(`${day.date}T00:00:00`).getDate() : formatDay(day.date)}</span>
        {day.noTeachingReason && (
          <Badge variant="neutral" className="max-w-[8rem] truncate" title={day.noTeachingReason}>
            {day.noTeachingReason}
          </Badge>
        )}
      </header>
      <ul className="space-y-1">
        {shown.map((l) => (
          <li key={l.lessonPlanTopicId + (l.sectionName ?? "")}>
            <button
              type="button"
              disabled={!canMove}
              onClick={() => onMove(l)}
              className="w-full rounded-md bg-accent/60 px-1.5 py-1 text-start hover:bg-accent disabled:cursor-default disabled:hover:bg-accent/60"
              title={`${l.topicTitle} · ${l.subjectName} · ${l.className}${l.teacherName ? ` · ${l.teacherName}` : ""}`}
            >
              <span className="block truncate font-medium">{l.topicTitle}</span>
              <span className="flex items-center justify-between gap-1 text-muted-foreground">
                <span className="truncate">
                  {l.subjectName} · {l.className}
                </span>
                {!compact && <StatusBadge map={PROGRESS_STATUS} value={l.status} />}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {compact && day.lessons.length > shown.length && <p className="mt-1 text-muted-foreground">{t("+{{v1}} more", { v1: day.lessons.length - shown.length })}</p>}
    </section>
  );
}

function MoveDialog({ lesson, onClose }: { lesson: CalendarLesson | null; onClose: () => void }) {
  const { t: tr } = useTranslation("lesson-portions");
  const plan = useQuery({ queryKey: ["portions", "lesson-plan", lesson?.lessonPlanId], queryFn: () => getLessonPlan(lesson!.lessonPlanId), enabled: Boolean(lesson) });
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (lesson) {
      setDate(lesson.date);
      setReason("");
    }
  }, [lesson]);
  const p = plan.data;
  const save = useApiMutation(
    () => {
      const row = p!.topics!.find((t) => t.syllabusTopicId === lesson!.syllabusTopicId)!;
      return rescheduleLessonPlan(p!.id, { topics: [{ syllabusTopicId: row.syllabusTopicId, plannedDate: date, plannedPeriods: row.plannedPeriods }], reason: reason.trim(), rowVersion: p!.rowVersion });
    },
    { success: "Lesson moved", invalidate: [["portions", "calendar"], ["portions", "lesson-plans"], ["portions", "dashboard"]], onSuccess: onClose },
  );
  const outside = p && date && ((p.plannedStartDate && date < p.plannedStartDate) || (p.plannedEndDate && date > p.plannedEndDate));
  const invalid = !date || !reason.trim() || Boolean(outside) || date === lesson?.date || !p?.topics?.some((t) => t.syllabusTopicId === lesson?.syllabusTopicId);
  return (
    <Dialog open={Boolean(lesson)} onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tr("Move lesson")}</DialogTitle>
          <DialogDescription>
            {lesson?.topicTitle} · {lesson?.subjectName} · {lesson?.className} {lesson?.sectionName ?? ""}{tr(". Saved as a revision of the plan with your reason.")}
          </DialogDescription>
        </DialogHeader>
        {plan.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : plan.isError ? (
          <ErrorState onRetry={() => plan.refetch()} retrying={plan.isFetching} />
        ) : (
          <div className="space-y-4">
            <FormField label={tr("New date")} htmlFor="mv-date" required error={outside ? `Pick a date between ${p?.plannedStartDate} and ${p?.plannedEndDate}` : undefined} hint={p?.plannedStartDate ? tr("The plan runs {{v1}} – {{v2}}. Change the plan's dates from My plan.", { v1: formatDay(p.plannedStartDate), v2: formatDay(p.plannedEndDate ?? p.plannedStartDate) }) : undefined}>
              <Input id="mv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label={tr("Reason")} htmlFor="mv-reason" required>
              <Textarea id="mv-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={900} />
            </FormField>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            {tr("Cancel")}
          </Button>
          <Button onClick={() => save.mutate(undefined)} disabled={invalid} loading={save.isPending}>
            {tr("Move lesson")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
