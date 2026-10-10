import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComboboxOption } from "@/components/ui/combobox";
import { listAcademicYears } from "@/features/academics/api";
import { listStudents } from "@/features/students/api";
import { extractApiErrorMessage } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";

export const ALL = "__all";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const options = <T extends string>(labels: Record<T, string>): Option<T>[] => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

// ── Access ──────────────────────────────────────────────────────────────────

export interface ExtracurricularAccess {
  /** Any access to the module at all. */
  canView: boolean;
  /** Set up categories, activities, groups, teams, events, campaigns and settings. */
  canManage: boolean;
  /** Take the register of a session. */
  canTakeAttendance: boolean;
  /** Approve requests, publish achievements, verify measurements. */
  canApprove: boolean;
  /** A parent or student: browses, asks to join, sees only their own records. */
  isFamily: boolean;
}

/**
 * What the signed-in user may do, from the module flag and the staff actions in their session. A session from before staff
 * actions existed (no "Staff.Managed" marker) is judged by the module alone, as the server does. The server enforces all of
 * this again; this only decides what to show.
 */
export function useExtracurricularAccess(): ExtracurricularAccess {
  const permissions = useAuthStore((s) => s.modulePermissions);
  const role = useAuthStore((s) => s.user?.role);
  const canView = Boolean(permissions?.extracurricular);
  const family = role === "parent" || role === "student";
  if (!canView || family) return { canView, canManage: false, canTakeAttendance: false, canApprove: false, isFamily: family };
  const managed = Boolean(permissions?.["Staff.Managed"]);
  const can = (action: string) => (managed ? Boolean(permissions?.[action]) : true);
  return {
    canView,
    canManage: can("Extracurricular.Manage"),
    canTakeAttendance: can("Extracurricular.Attendance"),
    canApprove: can("Extracurricular.Approve"),
    isFamily: false,
  };
}

// ── Academic year ───────────────────────────────────────────────────────────

/** "2026-27" for a date, with the school year starting in June. */
export function academicYearLabel(date = new Date()): string {
  const start = date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** The school's academic years (current first). Falls back to the calendar-derived year when none are set up or the list can't be read. */
export function useAcademicYears() {
  const query = useQuery({ queryKey: ["extracurricular", "academic-years"], queryFn: listAcademicYears, retry: false, staleTime: 5 * 60_000 });
  const fallback = academicYearLabel();
  const years = query.data ?? [];
  const names = [...new Set([...years.filter((y) => y.isCurrent).map((y) => y.name), ...years.map((y) => y.name), fallback])];
  return { names, current: years.find((y) => y.isCurrent)?.name ?? names[0] ?? fallback, isLoading: query.isLoading };
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function toastApiError(error: unknown) {
  const message = extractApiErrorMessage(error);
  toast.error(message, { id: `ec-${message}` });
}

/** A mutation that refreshes the module's queries, says what happened, and reports a server refusal in plain words. */
export function useApiMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, opts: { success?: string | ((r: TResult) => string); invalidate?: QueryKey[]; onSuccess?: (r: TResult) => void } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      for (const key of opts.invalidate ?? [["extracurricular"]]) queryClient.invalidateQueries({ queryKey: key });
      const message = typeof opts.success === "function" ? opts.success(result) : opts.success;
      if (message) toast.success(message);
      opts.onSuccess?.(result);
    },
    onError: toastApiError,
  });
}

// ── Small controls ──────────────────────────────────────────────────────────

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
}) {
  return (
    <Select value={value ?? (allLabel ? ALL : undefined)} onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-invalid={invalid ? true : undefined}>
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

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10", className)} style={{ backgroundColor: color }} />;
}

export const formatDate = (iso?: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const formatTime = (t?: string | null) => (t ? t.slice(0, 5) : "—");
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** The students the signed-in user may pick: everyone in a campus for staff, only their own children for a parent or student. */
export function useStudentOptions(enabled = true) {
  const query = useQuery({ queryKey: ["extracurricular", "students"], queryFn: listStudents, enabled, staleTime: 5 * 60_000 });
  const options: ComboboxOption[] = (query.data ?? [])
    .filter((s) => !s.status || s.status === "active")
    .map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}`.trim(), hint: [s.className && `${s.className}${s.section ? ` ${s.section}` : ""}`, s.admissionNumber].filter(Boolean).join(" · ") }));
  return { options, isLoading: query.isLoading };
}
