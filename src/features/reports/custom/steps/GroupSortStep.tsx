import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { AGGREGATE_LABELS, RECORD_COUNT_KEY, aggregateKey, aggregatesFor, moveItem } from "../definition";
import type { AggregateFunction, AggregateSpec, CustomReportDefinition, DatasetField, ReportService, SortSpec } from "../types";
import SamplePreview from "./SamplePreview";

interface Props {
  datasetKey: string;
  service?: ReportService;
  fields: DatasetField[];
  definition: CustomReportDefinition;
  onChange: (patch: Partial<CustomReportDefinition>) => void;
  onShowGroupCounts: (on: boolean) => void;
}

/** Step 4: group by one or more columns with counts and totals, and sort at several levels. */
export default function GroupSortStep({ datasetKey, service, fields, definition: d, onChange, onShowGroupCounts }: Props) {
  const { t } = useTranslation("reports");
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const grouped = d.groupBy.length > 0;
  const groupable = fields.filter((f) => f.groupable && !f.computed && !d.groupBy.includes(f.key));
  const calcFields = fields.filter((f) => aggregatesFor(f).length > 0);
  const labelOf = (key: string) => byKey.get(key)?.label ?? key;

  const sortChoices: { key: string; label: string }[] = grouped
    ? [
        ...d.groupBy.map((k) => ({ key: k, label: labelOf(k) })),
        { key: RECORD_COUNT_KEY, label: t("Records") },
        ...d.aggregates.map((a) => ({ key: aggregateKey(a.function, a.field), label: a.label || `${t(AGGREGATE_LABELS[a.function])} ${t("of")} ${labelOf(a.field)}` })),
      ]
    : fields.filter((f) => !f.computed).map((f) => ({ key: f.key, label: f.label }));

  const setSort = (i: number, patch: Partial<SortSpec>) => onChange({ sort: d.sort.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setAgg = (i: number, patch: Partial<AggregateSpec>) => onChange({ aggregates: d.aggregates.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  function addAggregate() {
    const field = calcFields.find((f) => !d.aggregates.some((a) => a.field === f.key)) ?? calcFields[0];
    if (field) onChange({ aggregates: [...d.aggregates, { field: field.key, function: aggregatesFor(field)[0], label: null }] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">{t("Group, total and sort")}</h2>
        <p className="text-sm text-muted-foreground">{t("All optional. Group by Class and Division to get a count for each, add totals such as an average, and choose the order.")}</p>
      </div>

      <section className="space-y-2 rounded-xl border bg-card p-4" aria-label={t("Grouping")}>
        <h3 className="text-sm font-medium">{t("Group by")}</h3>
        {grouped && (
          <ol className="space-y-1.5">
            {d.groupBy.map((k, i) => (
              <li key={k} className="flex items-center gap-1.5 rounded-lg border bg-background p-1.5">
                <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                <span className="flex-1 text-sm">{labelOf(k)}</span>
                <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => onChange({ groupBy: moveItem(d.groupBy, i, i - 1) })} aria-label={t("Move {{name}} up", { name: labelOf(k) })}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon-sm" disabled={i === d.groupBy.length - 1} onClick={() => onChange({ groupBy: moveItem(d.groupBy, i, i + 1) })} aria-label={t("Move {{name}} down", { name: labelOf(k) })}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange({ groupBy: d.groupBy.filter((x) => x !== k), sort: d.sort.filter((s) => s.field !== k) })} aria-label={t("Remove {{name}}", { name: labelOf(k) })}><X className="h-4 w-4" /></Button>
              </li>
            ))}
          </ol>
        )}
        {d.groupBy.length < 4 && (
          <NativeSelect value="" onChange={(e) => e.target.value && onChange({ groupBy: [...d.groupBy, e.target.value] })} aria-label={t("Add a grouping column")}>
            <option value="">{grouped ? t("Add another grouping column…") : t("Choose a column to group by…")}</option>
            {groupable.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </NativeSelect>
        )}
        {grouped && (
          <>
            <p className="text-xs text-muted-foreground">{t("A grouped report shows one row per group: the grouping columns, the record count and your totals. Column choices from step 2 are not shown.")}</p>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={d.settings.showGroupCounts} onCheckedChange={onShowGroupCounts} />
              {t("Show the record count for each group")}
            </label>
          </>
        )}
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-4" aria-label={t("Totals")}>
        <h3 className="text-sm font-medium">{t("Totals and calculations")}</h3>
        {d.aggregates.length === 0 && <p className="text-sm text-muted-foreground">{t("No totals. Add one to get a count, total, average, lowest or highest.")}</p>}
        <ul className="space-y-1.5">
          {d.aggregates.map((a, i) => {
            const field = byKey.get(a.field);
            const fns = field ? aggregatesFor(field) : [];
            return (
              <li key={i} className="grid items-center gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <NativeSelect value={a.function} onChange={(e) => setAgg(i, { function: e.target.value as AggregateFunction })} aria-label={t("Calculation")}>
                  {fns.map((fn) => <option key={fn} value={fn}>{t(AGGREGATE_LABELS[fn])}</option>)}
                </NativeSelect>
                <NativeSelect
                  value={a.field}
                  onChange={(e) => { const f = byKey.get(e.target.value); if (f) setAgg(i, { field: f.key, function: aggregatesFor(f).includes(a.function) ? a.function : aggregatesFor(f)[0] }); }}
                  aria-label={t("Column to calculate")}
                >
                  {calcFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </NativeSelect>
                <Input value={a.label ?? ""} onChange={(e) => setAgg(i, { label: e.target.value })} placeholder={t("Column heading (optional)")} aria-label={t("Heading for this total")} maxLength={200} />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange({ aggregates: d.aggregates.filter((_, j) => j !== i), sort: d.sort.filter((s) => s.field !== aggregateKey(a.function, a.field)) })} aria-label={t("Remove total {{n}}", { n: i + 1 })}><X className="h-4 w-4" /></Button>
              </li>
            );
          })}
        </ul>
        {d.aggregates.length < 10 && calcFields.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={addAggregate}><Plus className="h-4 w-4" />{t("Add a total")}</Button>
        )}
        {!grouped && d.aggregates.length > 0 && <p className="text-xs text-muted-foreground">{t("Without grouping, totals cover the whole report and appear above the table.")}</p>}
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-4" aria-label={t("Sorting")}>
        <h3 className="text-sm font-medium">{t("Sort by")}</h3>
        <ol className="space-y-1.5">
          {d.sort.map((s, i) => (
            <li key={i} className="grid items-center gap-2 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,12rem)_auto]">
              <span className="text-xs text-muted-foreground">{i === 0 ? t("First") : t("Then")}</span>
              <NativeSelect value={s.field} onChange={(e) => setSort(i, { field: e.target.value })} aria-label={t("Sort column")}>
                {sortChoices.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </NativeSelect>
              <NativeSelect value={s.direction} onChange={(e) => setSort(i, { direction: e.target.value as "asc" | "desc" })} aria-label={t("Sort direction")}>
                <option value="asc">{t("Ascending (A → Z, low → high)")}</option>
                <option value="desc">{t("Descending (Z → A, high → low)")}</option>
              </NativeSelect>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange({ sort: d.sort.filter((_, j) => j !== i) })} aria-label={t("Remove sort level {{n}}", { n: i + 1 })}><X className="h-4 w-4" /></Button>
            </li>
          ))}
        </ol>
        {d.sort.length < 5 && sortChoices.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ sort: [...d.sort, { field: sortChoices.find((c) => !d.sort.some((s) => s.field === c.key))?.key ?? sortChoices[0].key, direction: "asc" }] })}>
            <Plus className="h-4 w-4" />{d.sort.length === 0 ? t("Add a sort") : t("Add another level")}
          </Button>
        )}
      </section>

      <section aria-label={t("Preview")} className="space-y-2">
        <h3 className="text-sm font-medium">{t("Preview")}</h3>
        <SamplePreview datasetKey={datasetKey} service={service} definition={d} fields={fields} rows={8} />
      </section>
    </div>
  );
}
