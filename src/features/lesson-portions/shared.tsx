import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { listAcademicYears, listClasses, listSections, listSubjects, listTerms } from "@/features/academics/api";
import { listStaff } from "@/features/staff/api";
import { extractApiErrorMessage } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import type { ApprovalStatus, ChapterStatus, CompletionMode, CurriculumBoard, LessonPlanType, PortionFilters, PortionRisk, ProgressStatus, ResourceKind, SyllabusStatus } from "./types";

export const ALL = "__all";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

// ── Access ──────────────────────────────────────────────────────────────────

export interface PortionAccess {
  /** The module is in the school's plan and the login can open it. */
  canView: boolean;
  /** Curricula, syllabus plans, chapters and topics, imports, exam portions, settings. */
  canManage: boolean;
  /** Create and revise lesson plans. */
  canPlan: boolean;
  /** Record teaching progress. */
  canProgress: boolean;
  /** Approve plans, reschedule and correct progress. */
  canApprove: boolean;
  /** School-wide reports and the audit trail. */
  canReport: boolean;
  /** A parent or student: the read-only syllabus view. */
  isFamily: boolean;
  /** Reports and approvals - anyone who sees more than their own classes. */
  seesAll: boolean;
}

/**
 * What the signed-in user may do, from the module flag and the staff actions in their session. A session from before staff actions
 * existed (no "Staff.Managed" marker) is judged by the module, with the management actions kept for school leaders - the same rule the
 * server applies. The server enforces everything again; this only decides what to show.
 */
export function usePortionAccess(): PortionAccess {
  const permissions = useAuthStore((s) => s.modulePermissions);
  const role = useAuthStore((s) => s.user?.role);
  const canView = Boolean(permissions?.portions);
  const isFamily = role === "parent" || role === "student";
  if (!canView || isFamily) return { canView, canManage: false, canPlan: false, canProgress: false, canApprove: false, canReport: false, isFamily, seesAll: false };

  const managed = Boolean(permissions?.["Staff.Managed"]);
  const leader = role === "admin" || role === "principal" || role === "superAdmin";
  const can = (action: string, elevated: boolean) => (managed ? Boolean(permissions?.[action]) : !elevated || leader);
  const canManage = can("Portions.Manage", true);
  const canApprove = can("Portions.Approve", true);
  const canReport = can("Portions.Reports", true);
  return {
    canView,
    canManage,
    canPlan: can("Portions.Plan", false),
    canProgress: can("Portions.Progress", false),
    canApprove,
    canReport,
    isFamily: false,
    seesAll: canManage || canApprove || canReport,
  };
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const BOARD_LABEL: Record<CurriculumBoard, string> = {
  Cbse: "CBSE",
  Icse: "ICSE",
  KeralaState: "Kerala State Board",
  InternationalBaccalaureate: "International Baccalaureate",
  Cambridge: "Cambridge",
  Other: "Other",
};

export const SYLLABUS_STATUS: Record<SyllabusStatus, { label: string; variant: BadgeVariant }> = {
  Draft: { label: "Draft", variant: "warning" },
  Published: { label: "Published", variant: "success" },
  Archived: { label: "Archived", variant: "neutral" },
};

export const PROGRESS_STATUS: Record<ProgressStatus, { label: string; variant: BadgeVariant }> = {
  NotStarted: { label: "Not started", variant: "neutral" },
  InProgress: { label: "In progress", variant: "info" },
  Completed: { label: "Completed", variant: "success" },
  Delayed: { label: "Delayed", variant: "danger" },
};

export const CHAPTER_STATUS: Record<ChapterStatus, { label: string; variant: BadgeVariant }> = {
  NotStarted: PROGRESS_STATUS.NotStarted,
  InProgress: PROGRESS_STATUS.InProgress,
  Completed: PROGRESS_STATUS.Completed,
  Delayed: PROGRESS_STATUS.Delayed,
};

export const RISK: Record<PortionRisk, { label: string; variant: BadgeVariant; bar: string }> = {
  OnTrack: { label: "On track", variant: "success", bar: "bg-success" },
  AtRisk: { label: "At risk", variant: "warning", bar: "bg-warning" },
  Behind: { label: "Behind", variant: "danger", bar: "bg-destructive" },
  Overdue: { label: "Overdue", variant: "danger", bar: "bg-destructive" },
  Complete: { label: "Complete", variant: "brand", bar: "bg-primary" },
};

export const APPROVAL: Record<ApprovalStatus, { label: string; variant: BadgeVariant }> = {
  Draft: { label: "Draft", variant: "neutral" },
  Submitted: { label: "Awaiting approval", variant: "warning" },
  Approved: { label: "Approved", variant: "success" },
  Rejected: { label: "Rejected", variant: "danger" },
  RevisionRequested: { label: "Changes requested", variant: "info" },
};

export const PLAN_TYPE_LABEL: Record<LessonPlanType, string> = { Weekly: "Weekly", Monthly: "Monthly", TermWise: "Term-wise", Annual: "Annual" };
export const COMPLETION_MODE_LABEL: Record<CompletionMode, string> = {
  Periods: "Planned periods",
  Topics: "Number of topics",
  Chapters: "Number of chapters",
  Weighted: "Topic weights",
};
export const RESOURCE_KIND_LABEL: Record<ResourceKind, string> = {
  Textbook: "Textbook",
  Reference: "Reference",
  Notes: "Notes",
  Presentation: "Presentation",
  Worksheet: "Worksheet",
  Link: "Web link",
  Other: "Other",
};

export const ALERT_LABEL: Record<string, string> = {
  deadline: "Upcoming chapter deadlines",
  "overdue-plan": "Overdue lesson plans",
  "missing-update": "Missing teaching updates",
  "behind-target": "Syllabus behind target",
  revision: "Revised lesson plans",
  approval: "Plan approvals and decisions",
  "term-end": "Term-end syllabus deadlines",
};

export const options = <T extends string>(labels: Record<T, string>): Option<T>[] => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export function StatusBadge({ map, value, className }: { map: Record<string, { label: string; variant: BadgeVariant }>; value: string; className?: string }) {
  const s = map[value] ?? { label: value, variant: "neutral" as BadgeVariant };
  return (
    <Badge variant={s.variant} dot className={className}>
      {s.label}
    </Badge>
  );
}

export const RiskBadge = ({ risk }: { risk: PortionRisk }) => <StatusBadge map={RISK} value={risk} />;

// ── Formatting ──────────────────────────────────────────────────────────────

export const formatDate = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const formatDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const pct = (n?: number | null) => (n === null || n === undefined ? "—" : `${n.toFixed(1).replace(/\.0$/, "")}%`);
export const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => toIso(new Date());
export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIso(d);
};
export const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIso(d);
};

// ── Progress bar ────────────────────────────────────────────────────────────

/** Actual completion as a bar with a tick for where the plan says it should be by now. */
export function ProgressBar({ percent, planned, risk, className, label }: { percent: number; planned?: number | null; risk?: PortionRisk; className?: string; label?: string }) {
  const value = Math.max(0, Math.min(100, percent));
  const tone = risk ? RISK[risk].bar : "bg-primary";
  const plannedText = planned === null || planned === undefined ? "" : `, planned ${pct(planned)}`;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-label={label ?? `Completion ${pct(percent)}${plannedText}`}
        className="relative h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-secondary"
      >
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${value}%` }} />
        {planned !== null && planned !== undefined && (
          <span aria-hidden="true" className="absolute top-0 h-full w-0.5 bg-foreground/60" style={{ left: `calc(${Math.max(0, Math.min(100, planned))}% - 1px)` }} title={`Planned ${pct(planned)}`} />
        )}
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">{pct(percent)}</span>
    </div>
  );
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function toastApiError(error: unknown) {
  const message = extractApiErrorMessage(error);
  toast.error(message, { id: `lp-${message}` });
}

/** A mutation that refreshes the module's queries, says what happened, and reports a server refusal in plain words. */
export function useApiMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: { success?: string | ((r: TResult) => string); invalidate?: QueryKey[]; onSuccess?: (r: TResult) => void } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      for (const key of opts.invalidate ?? [["portions"]]) queryClient.invalidateQueries({ queryKey: key });
      const message = typeof opts.success === "function" ? opts.success(result) : opts.success;
      if (message) toast.success(message);
      opts.onSuccess?.(result);
    },
    onError: toastApiError,
  });
}

// ── Reference data ──────────────────────────────────────────────────────────

const STALE = 5 * 60_000;

/** Years, terms, classes, sections, subjects and teachers - the choices every filter and form needs, loaded once and shared. */
export function useReferenceData(opts: { teachers?: boolean } = {}) {
  const years = useQuery({ queryKey: ["portions", "ref", "years"], queryFn: listAcademicYears, staleTime: STALE });
  const terms = useQuery({ queryKey: ["portions", "ref", "terms"], queryFn: listTerms, staleTime: STALE });
  const classes = useQuery({ queryKey: ["portions", "ref", "classes"], queryFn: listClasses, staleTime: STALE });
  const sections = useQuery({ queryKey: ["portions", "ref", "sections"], queryFn: listSections, staleTime: STALE });
  const subjects = useQuery({ queryKey: ["portions", "ref", "subjects"], queryFn: listSubjects, staleTime: STALE });
  const staff = useQuery({ queryKey: ["portions", "ref", "staff"], queryFn: listStaff, staleTime: STALE, enabled: Boolean(opts.teachers) });

  return useMemo(() => {
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true });
    const yearList = [...(years.data ?? [])].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.startDate.localeCompare(a.startDate));
    return {
      years: yearList,
      currentYearId: yearList.find((y) => y.isCurrent)?.id ?? yearList[0]?.id,
      terms: terms.data ?? [],
      classes: [...(classes.data ?? [])].sort(byName),
      sections: [...(sections.data ?? [])].sort(byName),
      subjects: [...(subjects.data ?? [])].sort(byName),
      teachers: (staff.data ?? [])
        .filter((s) => s.designation === "Teacher" && s.status !== "resigned" && s.status !== "terminated")
        .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() }))
        .sort(byName),
      isLoading: years.isLoading || classes.isLoading || subjects.isLoading,
    };
  }, [years.data, terms.data, classes.data, sections.data, subjects.data, staff.data, years.isLoading, classes.isLoading, subjects.isLoading]);
}

export type ReferenceData = ReturnType<typeof useReferenceData>;

// ── Controls ────────────────────────────────────────────────────────────────

export function SelectField<T extends string>({
  id,
  value,
  onChange,
  items,
  placeholder,
  allLabel,
  disabled,
  className,
  invalid,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: T | undefined | null;
  onChange: (value: T | undefined) => void;
  items: Option<T>[];
  placeholder?: string;
  /** Adds a leading "all" choice that clears the value (for filters). */
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Select value={value ?? (allLabel ? ALL : undefined)} onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel} aria-invalid={invalid ? true : undefined}>
        <SelectValue placeholder={placeholder ?? "Select"} />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FilterBarProps {
  value: PortionFilters;
  onChange: (next: PortionFilters) => void;
  /** Which controls to show. */
  show?: Array<"year" | "term" | "class" | "section" | "subject" | "teacher" | "range">;
  data: ReferenceData;
  className?: string;
}

/** Year, term, class, section, subject, teacher and date range - the filters the dashboards and reports share. */
export function FilterBar({ value, onChange, show = ["year", "term", "class", "section", "subject", "teacher"], data, className }: FilterBarProps) {
  const set = (patch: Partial<PortionFilters>) => onChange({ ...value, ...patch });
  const termsOfYear = data.terms.filter((t) => !value.academicYearId || t.academicYearId === value.academicYearId);
  const sectionsOfClass = data.sections.filter((s) => value.classId && s.classId === value.classId);
  const yearValue = value.academicYearId ?? data.currentYearId;
  const field = (id: string, label: string, control: React.ReactNode) => (
    <div className="min-w-0 space-y-1" key={id}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {control}
    </div>
  );

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {show.includes("year") &&
        field("pf-year", "Academic year", <SelectField id="pf-year" value={yearValue} onChange={(v) => set({ academicYearId: v, termId: undefined })} items={data.years.map((y) => ({ value: y.id, label: y.name }))} className="w-full" />)}
      {show.includes("term") &&
        field("pf-term", "Term", <SelectField id="pf-term" value={value.termId} onChange={(v) => set({ termId: v })} allLabel="Whole year" items={termsOfYear.map((t) => ({ value: t.id, label: t.name }))} className="w-full" />)}
      {show.includes("class") &&
        field("pf-class", "Class", <SelectField id="pf-class" value={value.classId} onChange={(v) => set({ classId: v, sectionId: undefined })} allLabel="All classes" items={data.classes.map((c) => ({ value: c.id, label: c.name }))} className="w-full" />)}
      {show.includes("section") &&
        field("pf-section", "Section", <SelectField id="pf-section" value={value.sectionId} onChange={(v) => set({ sectionId: v })} allLabel="All sections" disabled={!value.classId} items={sectionsOfClass.map((s) => ({ value: s.id, label: s.name }))} className="w-full" />)}
      {show.includes("subject") &&
        field("pf-subject", "Subject", <SelectField id="pf-subject" value={value.subjectId} onChange={(v) => set({ subjectId: v })} allLabel="All subjects" items={data.subjects.map((s) => ({ value: s.id, label: s.name }))} className="w-full" />)}
      {show.includes("teacher") &&
        field("pf-teacher", "Teacher", <SelectField id="pf-teacher" value={value.staffId} onChange={(v) => set({ staffId: v })} allLabel="All teachers" items={data.teachers.map((t) => ({ value: t.id, label: t.name }))} className="w-full" />)}
      {show.includes("range") && (
        <>
          {field("pf-from", "From", <input id="pf-from" type="date" value={value.from ?? ""} max={value.to || undefined} onChange={(e) => set({ from: e.target.value || undefined })} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" />)}
          {field("pf-to", "To", <input id="pf-to" type="date" value={value.to ?? ""} min={value.from || undefined} onChange={(e) => set({ to: e.target.value || undefined })} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" />)}
        </>
      )}
    </div>
  );
}

/**
 * Wraps a dialog's onOpenChange so closing it (Escape, the X, a click outside, Cancel) with unsaved edits asks first,
 * and never lets it close while a save is in flight.
 */
export function guardedClose(dirty: boolean, saving: boolean, onOpenChange: (open: boolean) => void) {
  return (open: boolean) => {
    if (!open) {
      if (saving) return;
      if (dirty && !window.confirm("Discard your changes?")) return;
    }
    onOpenChange(open);
  };
}
