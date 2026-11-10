import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listAcademicYears } from "@/features/academics/api";
import type { DatasetDescriptor, ReportSettings } from "../types";

interface Props {
  dataset: DatasetDescriptor;
  settings: ReportSettings;
  onChange: (patch: Partial<ReportSettings>) => void;
  /** Whether the school has a logo to print. */
  hasLogo: boolean;
}

/** Step 5: how the finished report looks and what period it covers. */
export default function SettingsStep({ dataset, settings: s, onChange, hasLogo }: Props) {
  const { t } = useTranslation("reports");
  const years = useQuery({ queryKey: ["academic-years"], queryFn: listAcademicYears, staleTime: 5 * 60_000 });
  const hasYear = dataset.fields.some((f) => f.key === "academicYear");
  const hasDate = Boolean(dataset.dateFieldLabel);
  const badRange = Boolean(s.dateFrom && s.dateTo && s.dateFrom > s.dateTo);

  const toggle = (label: string, checked: boolean, set: (on: boolean) => void) => (
    <label className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={set} />
    </label>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">{t("Report settings")}</h2>
        <p className="text-sm text-muted-foreground">{t("Titles, period and page layout for the finished report and its printout.")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t("Report title")} htmlFor="cr-title" hint={t("Shown at the top of the printout.")}>
          <Input id="cr-title" value={s.title ?? ""} maxLength={200} onChange={(e) => onChange({ title: e.target.value })} />
        </FormField>
        <FormField label={t("Report header")} htmlFor="cr-header" optional hint={t("A line above the title, for example the department or term.")}>
          <Input id="cr-header" value={s.header ?? ""} maxLength={300} onChange={(e) => onChange({ header: e.target.value })} />
        </FormField>
        <FormField label={t("Description")} htmlFor="cr-desc" optional className="md:col-span-2">
          <Textarea id="cr-desc" rows={2} value={s.description ?? ""} maxLength={1000} onChange={(e) => onChange({ description: e.target.value })} />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField label={t("Academic year")} htmlFor="cr-year" optional hint={hasYear ? undefined : t("This data source is not tied to an academic year.")}>
          <NativeSelect id="cr-year" value={s.academicYearId ?? ""} onChange={(e) => onChange({ academicYearId: e.target.value || null })} disabled={!hasYear}>
            <option value="">{t("All years")}</option>
            {(years.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ` (${t("current")})` : ""}</option>)}
          </NativeSelect>
        </FormField>
        <FormField label={hasDate ? t("From ({{what}})", { what: dataset.dateFieldLabel }) : t("From")} htmlFor="cr-from" optional error={badRange ? t("Start must be on or before the end.") : undefined}>
          <Input id="cr-from" type="date" value={s.dateFrom ?? ""} disabled={!hasDate} onChange={(e) => onChange({ dateFrom: e.target.value || null })} />
        </FormField>
        <FormField label={hasDate ? t("To ({{what}})", { what: dataset.dateFieldLabel }) : t("To")} htmlFor="cr-to" optional>
          <Input id="cr-to" type="date" value={s.dateTo ?? ""} disabled={!hasDate} onChange={(e) => onChange({ dateTo: e.target.value || null })} />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t("Page orientation")}>
          <SegmentedControl<"portrait" | "landscape">
            aria-label={t("Page orientation")}
            value={s.orientation}
            onValueChange={(orientation) => onChange({ orientation })}
            options={[{ value: "portrait", label: t("Portrait") }, { value: "landscape", label: t("Landscape") }]}
          />
        </FormField>
        <FormField label={t("Page size")}>
          <SegmentedControl<"A4" | "A3" | "Letter">
            aria-label={t("Page size")}
            value={s.pageSize}
            onValueChange={(pageSize) => onChange({ pageSize })}
            options={[{ value: "A4", label: "A4" }, { value: "A3", label: "A3" }, { value: "Letter", label: t("Letter") }]}
          />
        </FormField>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {toggle(hasLogo ? t("Show the school logo") : t("Show the school logo (none uploaded)"), s.logoUrl === "school" && hasLogo, (on) => onChange({ logoUrl: on ? "school" : "" }))}
        {toggle(t("Show the total record count"), s.showTotalCount, (on) => onChange({ showTotalCount: on }))}
        {toggle(t("Show the date and time generated"), s.showGeneratedAt, (on) => onChange({ showGeneratedAt: on }))}
        {toggle(t("Show page numbers"), s.showPageNumbers, (on) => onChange({ showPageNumbers: on }))}
      </div>

      <FormField label={t("Footer text")} htmlFor="cr-footer" optional hint={t("Printed at the bottom of every page, instead of the school name.")}>
        <Input id="cr-footer" value={s.footer ?? ""} maxLength={300} onChange={(e) => onChange({ footer: e.target.value })} />
      </FormField>
    </div>
  );
}
