import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DATE_PRESETS, monthRange, resolvePreset, validateRange, type DatePreset, type YearBounds } from "./dateRanges";
import type { ReportDescriptor, ReportFilterDef, ReportOption } from "./types";

const ANY = "__any__";

export interface FilterOptionLists {
  academicYears: (ReportOption & YearBounds)[];
  classes: ReportOption[];
  /** Sections carry their class so the list can follow the chosen class. */
  sections: (ReportOption & { classId: string })[];
  branches: ReportOption[];
  terms: ReportOption[];
  /** Exams carry their class so the list can follow the chosen class. */
  exams: (ReportOption & { classId: string })[];
  subjects: ReportOption[];
  /** Teachers, for the Teacher filter. */
  teachers: ReportOption[];
  /** Transport routes, vehicles and hostels (CampusService), and the book and stock categories. */
  routes: ReportOption[];
  buses: ReportOption[];
  hostels: ReportOption[];
  bookCategories: ReportOption[];
  itemCategories: ReportOption[];
}

/** The options a select filter offers, whether fixed by the report or taken from a list the page already loads. */
export function optionsFor(def: ReportFilterDef, lists: FilterOptionLists, values: Record<string, string>): ReportOption[] {
  if (def.options?.length) return def.options;
  switch (def.source) {
    case "academicYears":
      return lists.academicYears;
    case "classes":
      return lists.classes;
    case "sections":
      return values.classId ? lists.sections.filter((s) => s.classId === values.classId) : lists.sections;
    case "branches":
      return lists.branches;
    case "terms":
      return lists.terms;
    case "exams":
      return values.classId ? lists.exams.filter((e) => e.classId === values.classId) : lists.exams;
    case "subjects":
      return lists.subjects;
    case "teachers":
      return lists.teachers;
    case "routes":
      return lists.routes;
    case "buses":
      return lists.buses;
    case "hostels":
      return lists.hostels;
    case "bookCategories":
      return lists.bookCategories;
    case "itemCategories":
      return lists.itemCategories;
    default:
      return [];
  }
}

interface Props {
  descriptor: ReportDescriptor;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  lists: FilterOptionLists;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  monthValue: string;
  onMonthChange: (month: string) => void;
  onApply: () => void;
  onReset: () => void;
  /** The first problem with the current values (missing required filter, bad date range), or null. */
  problem: string | null;
  applying?: boolean;
}

export default function ReportFilterPanel({
  descriptor, values, onChange, lists, datePreset, onDatePresetChange, monthValue, onMonthChange, onApply, onReset, problem, applying,
}: Props) {
  const { t } = useTranslation("reports");
  const set = (key: string, value: string) => {
    const next = { ...values, [key]: value };
    // A section belongs to one class: changing the class clears a section that no longer fits.
    if (key === "classId") {
      next.sectionId = "";
      // An exam belongs to one class, so a chosen exam that no longer fits is cleared too.
      if (values.examId && !lists.exams.some((e) => e.value === values.examId && e.classId === value)) next.examId = "";
    }
    onChange(next);
  };

  const hasRange = descriptor.filters.some((f) => f.key === "dateFrom") && descriptor.filters.some((f) => f.key === "dateTo");
  const rangeFrom = descriptor.filters.find((f) => f.key === "dateFrom");
  const rangeTo = descriptor.filters.find((f) => f.key === "dateTo");
  const others = useMemo(() => descriptor.filters.filter((f) => !(hasRange && (f.key === "dateFrom" || f.key === "dateTo"))), [descriptor, hasRange]);
  // Branch users only ever have their own branch, so a one-entry branch list is not worth showing.
  const visible = others.filter((f) => !(f.source === "branches" && lists.branches.length < 2));

  const applyPreset = (preset: DatePreset) => {
    onDatePresetChange(preset);
    if (preset === "custom") return;
    if (preset === "month") {
      const r = monthRange(monthValue);
      if (r) onChange({ ...values, dateFrom: r.from, dateTo: r.to });
      return;
    }
    const r = resolvePreset(preset, new Date(), lists.academicYears);
    if (r) onChange({ ...values, dateFrom: r.from, dateTo: r.to });
  };

  const rangeProblem = hasRange ? validateRange(values.dateFrom ?? "", values.dateTo ?? "") : null;

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
      aria-label={t("Report filters")}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hasRange && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="rf-preset">{t("Period")}</Label>
              <Select value={datePreset} onValueChange={(v) => applyPreset(v as DatePreset)}>
                <SelectTrigger id="rf-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {t(p.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {datePreset === "month" && (
              <div className="space-y-1.5">
                <Label htmlFor="rf-month">{t("Month")}</Label>
                <Input
                  id="rf-month"
                  type="month"
                  value={monthValue}
                  onChange={(e) => {
                    onMonthChange(e.target.value);
                    const r = monthRange(e.target.value);
                    if (r) onChange({ ...values, dateFrom: r.from, dateTo: r.to });
                  }}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="rf-from" required={rangeFrom?.required}>{t(rangeFrom?.label ?? "From")}</Label>
              <Input
                id="rf-from"
                type="date"
                value={values.dateFrom ?? ""}
                max={values.dateTo || undefined}
                aria-invalid={rangeProblem ? true : undefined}
                onChange={(e) => {
                  onDatePresetChange("custom");
                  set("dateFrom", e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rf-to" required={rangeTo?.required}>{t(rangeTo?.label ?? "To")}</Label>
              <Input
                id="rf-to"
                type="date"
                value={values.dateTo ?? ""}
                min={values.dateFrom || undefined}
                aria-invalid={rangeProblem ? true : undefined}
                onChange={(e) => {
                  onDatePresetChange("custom");
                  set("dateTo", e.target.value);
                }}
              />
            </div>
          </>
        )}

        {visible.map((def) => (
          <div key={def.key} className="space-y-1.5">
            <Label htmlFor={`rf-${def.key}`} required={def.required}>{t(def.label)}</Label>
            {def.type === "select" ? (
              <Select value={values[def.key] || ANY} onValueChange={(v) => set(def.key, v === ANY ? "" : v)}>
                <SelectTrigger id={`rf-${def.key}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>{t("All")}</SelectItem>
                  {optionsFor(def, lists, values).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`rf-${def.key}`}
                type={def.type === "date" ? "date" : def.type === "number" ? "number" : "text"}
                value={values[def.key] ?? ""}
                onChange={(e) => set(def.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={Boolean(problem)} loading={applying}>
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          {t("Apply filters")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t("Reset filters")}
        </Button>
        {problem && (
          <p role="alert" className="text-xs text-destructive-strong">
            {t(problem)}
          </p>
        )}
      </div>
    </form>
  );
}
