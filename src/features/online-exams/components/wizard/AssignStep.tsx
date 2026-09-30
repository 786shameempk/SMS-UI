import { useMemo, useState } from "react";
import { School, Users, UserCheck, type LucideIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import type { Section } from "@/features/academics/types";
import { cn } from "@/utils/cn";
import type { AssignableStudent } from "../../types";
import type { AssignMode, WizardState } from "./wizardState";

interface AssignStepProps {
  state: WizardState;
  update: (fn: (s: WizardState) => WizardState) => void;
  className?: string;
  sections: Section[];
  students: AssignableStudent[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  error?: string;
}

/** The students an assignment resolves to - same union the server computes. */
export function assignedStudents(state: WizardState, students: AssignableStudent[]): AssignableStudent[] {
  if (state.assignMode === "students") {
    const ids = new Set(state.studentIds);
    return students.filter((s) => ids.has(s.id));
  }
  if (state.assignMode === "sections") {
    const ids = new Set(state.sectionIds);
    return students.filter((s) => ids.has(s.sectionId));
  }
  return students.filter((s) => s.classId === state.classId);
}

const MODES: { value: AssignMode; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "class", label: "Whole class", hint: "Every section", icon: School },
  { value: "sections", label: "Sections", hint: "Pick sections", icon: Users },
  { value: "students", label: "Individual students", hint: "Pick students", icon: UserCheck },
];

export default function AssignStep({ state, update, className, sections, students, loading, failed, onRetry, error }: AssignStepProps) {
  const [search, setSearch] = useState("");
  const classSections = sections.filter((s) => s.classId === state.classId);
  const selected = assignedStudents(state, students);
  const countBySection = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of students) m.set(s.sectionId, (m.get(s.sectionId) ?? 0) + 1);
    return m;
  }, [students]);
  const visibleStudents = students.filter((s) => {
    const term = search.trim().toLowerCase();
    return !term || s.name.toLowerCase().includes(term) || (s.rollNumber ?? "").toLowerCase().includes(term) || s.admissionNumber.toLowerCase().includes(term);
  });

  const setMode = (mode: AssignMode) => update((s) => ({ ...s, assignMode: mode }));
  const toggle = (key: "sectionIds" | "studentIds", id: string, on: boolean) =>
    update((s) => ({ ...s, [key]: on ? Array.from(new Set([...s[key], id])) : s[key].filter((x) => x !== id) }));

  if (loading) return <LoadingState label="Loading students…" />;
  if (failed) return <ErrorState title="Couldn't load students" onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Who takes this exam" className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={state.assignMode === m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              state.assignMode === m.value ? "border-primary bg-accent/60 ring-1 ring-primary/30" : "border-border/80 hover:border-primary/40",
            )}
          >
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", state.assignMode === m.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
              <m.icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {state.assignMode === "class" && (
        <p className="rounded-xl bg-secondary/60 px-4 py-3 text-sm text-secondary-foreground">
          Everyone in <strong>{className ?? "the class"}</strong>, across {classSections.length} section{classSections.length === 1 ? "" : "s"}. Students who join the class later are included automatically.
        </p>
      )}

      {state.assignMode === "sections" &&
        (classSections.length === 0 ? (
          <EmptyState size="sm" title="This class has no sections" description="Add sections in Academic Setup, or assign the whole class." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {classSections.map((sec) => (
              <li key={sec.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 px-3.5 py-3 hover:bg-secondary/40">
                  <Checkbox checked={state.sectionIds.includes(sec.id)} onCheckedChange={(c) => toggle("sectionIds", sec.id, c === true)} />
                  <span className="flex-1 text-sm font-medium text-foreground">Section {sec.name}</span>
                  <span className="text-xs text-muted-foreground">{countBySection.get(sec.id) ?? 0} students</span>
                </label>
              </li>
            ))}
          </ul>
        ))}

      {state.assignMode === "students" &&
        (students.length === 0 ? (
          <EmptyState size="sm" title="No students in this class" description="Enrol students in Students, then assign them here." />
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput value={search} onValueChange={setSearch} placeholder="Search name, roll or admission no." className="max-w-xs" aria-label="Search students" />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-secondary-foreground">
                <Checkbox
                  checked={visibleStudents.length > 0 && visibleStudents.every((s) => state.studentIds.includes(s.id))}
                  onCheckedChange={(c) =>
                    update((st) => ({
                      ...st,
                      studentIds: c === true
                        ? Array.from(new Set([...st.studentIds, ...visibleStudents.map((s) => s.id)]))
                        : st.studentIds.filter((id) => !visibleStudents.some((s) => s.id === id)),
                    }))
                  }
                />
                Select all shown
              </label>
            </div>
            <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border/80">
              {visibleStudents.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-secondary/40">
                    <Checkbox checked={state.studentIds.includes(s.id)} onCheckedChange={(c) => toggle("studentIds", s.id, c === true)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {s.sectionLabel}
                        {s.rollNumber ? ` · Roll ${s.rollNumber}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}

      {error && <p role="alert" className="text-sm font-medium text-destructive-strong">{error}</p>}

      <p className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-3 text-sm" aria-live="polite">
        <Users className="h-4 w-4 text-muted-foreground" />
        <strong className="tabular-nums">{selected.length}</strong> student{selected.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}
