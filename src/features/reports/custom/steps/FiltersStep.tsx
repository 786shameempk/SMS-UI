import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Brackets, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/utils/cn";
import { getFieldValues } from "../api";
import { DATE_OPERATOR_LABELS, MAX_GROUP_DEPTH, OPERATOR_LABELS, conditionProblem, filtersProblem, isMultiValue, needsNoValue, newCondition, newGroup, operatorsFor } from "../definition";
import type { CustomReportDefinition, DatasetField, FilterCondition, FilterOperator, ReportService } from "../types";
import SamplePreview from "./SamplePreview";

interface Props {
  datasetKey: string;
  service?: ReportService;
  fields: DatasetField[];
  definition: CustomReportDefinition;
  onChange: (filters: FilterCondition[]) => void;
}

const EXAMPLES = [
  "Class equals Class 8",
  "Attendance % less than 75",
  "Joining Date between two dates",
  "Class 8 AND (Fee balance > 0 OR Attendance % < 75)",
];

/**
 * Step 3: any number of conditions, joined by AND / OR (AND is applied before OR), and bracketed groups that can nest
 * (for example A AND (B OR C)). Only complete conditions are used to run the report.
 */
export default function FiltersStep({ datasetKey, service, fields, definition, onChange }: Props) {
  const { t } = useTranslation("reports");
  const filters = definition.filters;
  const byKey = new Map(fields.map((f) => [f.key, f]));
  // Computed columns can only be filtered when the owning service can resolve them (student name, class ...).
  const filterFields = fields.filter((f) => !f.computed || f.externalFilter);
  // New conditions start on an ordinary column; looked-up ones (student name, class) have extra rules.
  const first = filterFields.find((f) => !f.computed) ?? filterFields[0];
  const problem = filtersProblem(filters, byKey);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">{t("Filter the records")}</h2>
        <p className="text-sm text-muted-foreground">{t("Add conditions to narrow the report. Use a group to bracket conditions, for example “Class 8 AND (balance over 0 OR attendance under 75)”. Leave this empty to include every record.")}</p>
      </div>

      {filters.length === 0 ? (
        <EmptyState
          title={t("No filters yet")}
          description={t("For example: {{examples}}.", { examples: EXAMPLES.map((e) => t(e)).join("; ") })}
          action={first ? <Button type="button" onClick={() => onChange([newCondition(first)])}><Plus className="h-4 w-4" />{t("Add a condition")}</Button> : undefined}
        />
      ) : (
        <ConditionList list={filters} onChange={onChange} depth={1} datasetKey={datasetKey} service={service} fields={filterFields} byKey={byKey} />
      )}

      {problem && <p role="status" className="text-sm text-warning-strong">{t(problem)}</p>}

      <section aria-label={t("Preview with these filters")} className="space-y-2">
        <h3 className="text-sm font-medium">{t("Preview")}</h3>
        <SamplePreview datasetKey={datasetKey} service={service} definition={definition} fields={fields} />
      </section>
    </div>
  );
}

interface ListProps {
  list: FilterCondition[];
  onChange: (list: FilterCondition[]) => void;
  depth: number;
  datasetKey: string;
  service?: ReportService;
  fields: DatasetField[];
  byKey: Map<string, DatasetField>;
}

function ConditionList({ list, onChange, depth, datasetKey, service, fields, byKey }: ListProps) {
  const { t } = useTranslation("reports");
  const update = (i: number, next: FilterCondition) => onChange(list.map((c, j) => (j === i ? next : c)));
  const remove = (i: number) => onChange(list.filter((_, j) => j !== i));
  const first = fields.find((f) => !f.computed) ?? fields[0];

  return (
    <div className={cn("space-y-2", depth > 1 && "rounded-xl border border-dashed border-primary/40 bg-accent/20 p-2")}>
      <ul className="space-y-2">
        {list.map((c, i) => (
          <li key={i} className="rounded-xl border bg-card p-3">
            {c.group ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {i === 0 ? <span className="text-sm font-medium text-muted-foreground">{t("Where")}</span> : <JoinSelect value={c.join ?? "and"} onChange={(join) => update(i, { ...c, join })} />}
                  <span className="flex items-center gap-1 text-sm font-medium"><Brackets className="h-4 w-4" aria-hidden="true" />{t("Group")}</span>
                  <span className="flex-1" />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label={t("Remove group {{n}}", { n: i + 1 })}><X className="h-4 w-4" /></Button>
                </div>
                <ConditionList list={c.group} onChange={(group) => (group.length === 0 ? remove(i) : update(i, { ...c, group }))} depth={depth + 1} datasetKey={datasetKey} service={service} fields={fields} byKey={byKey} />
              </div>
            ) : (
              <ConditionRow condition={c} first={i === 0} datasetKey={datasetKey} service={service} fields={fields} byKey={byKey} onChange={(next) => update(i, next)} onRemove={() => remove(i)} />
            )}
          </li>
        ))}
      </ul>
      {first && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...list, newCondition(first, "and")])}><Plus className="h-4 w-4" />{t("Add a condition")}</Button>
          {depth < MAX_GROUP_DEPTH && <Button type="button" variant="outline" size="sm" onClick={() => onChange([...list, newGroup(first, "and")])}><Brackets className="h-4 w-4" />{t("Add a group")}</Button>}
        </div>
      )}
    </div>
  );
}

function JoinSelect({ value, onChange }: { value: "and" | "or"; onChange: (v: "and" | "or") => void }) {
  const { t } = useTranslation("reports");
  return (
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value as "and" | "or")} aria-label={t("Join with the previous condition")} className="w-24">
      <option value="and">{t("AND")}</option>
      <option value="or">{t("OR")}</option>
    </NativeSelect>
  );
}

function ConditionRow({ condition: c, first, datasetKey, service, fields, byKey, onChange, onRemove }: {
  condition: FilterCondition; first: boolean; datasetKey: string; service?: ReportService; fields: DatasetField[]; byKey: Map<string, DatasetField>;
  onChange: (c: FilterCondition) => void; onRemove: () => void;
}) {
  const { t } = useTranslation("reports");
  const field = byKey.get(c.field);
  const problem = conditionProblem(c, field);
  return (
    <>
      <div className="grid items-start gap-2 sm:grid-cols-2 2xl:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        {first ? <span className="self-center text-sm font-medium text-muted-foreground">{t("Where")}</span> : <JoinSelect value={c.join ?? "and"} onChange={(join) => onChange({ ...c, join })} />}
        <NativeSelect value={c.field} onChange={(e) => { const f = byKey.get(e.target.value); if (f) onChange({ ...newCondition(f, c.join ?? "and") }); }} aria-label={t("Column")}>
          {fields.map((f) => <option key={f.key} value={f.key}>{f.group === fields[0]?.group ? f.label : `${f.group}: ${f.label}`}</option>)}
        </NativeSelect>
        <NativeSelect value={c.operator} onChange={(e) => onChange({ ...c, operator: e.target.value as FilterOperator, values: [], value: field?.type === "boolean" ? "true" : "", value2: "" })} aria-label={t("Condition")}>
          {(field ? operatorsFor(field) : []).map((op) => <option key={op} value={op}>{t((field?.type === "date" ? DATE_OPERATOR_LABELS[op] : undefined) ?? OPERATOR_LABELS[op])}</option>)}
        </NativeSelect>
        <div className="min-w-0">{field && <ValueEditor datasetKey={datasetKey} service={service} field={field} condition={c} onChange={onChange} />}</div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t("Remove condition")}><X className="h-4 w-4" /></Button>
      </div>
      {field?.externalFilter && <p className="mt-1.5 text-xs text-muted-foreground">{t("Looked up from the school records. It can only be combined with AND, outside groups.")}</p>}
      {problem && <p role="status" className="mt-1.5 text-xs text-warning-strong">{t(problem)}</p>}
    </>
  );
}

function ValueEditor({ datasetKey, service, field, condition: c, onChange }: { datasetKey: string; service?: ReportService; field: DatasetField; condition: FilterCondition; onChange: (c: FilterCondition) => void }) {
  const { t } = useTranslation("reports");
  if (needsNoValue(c.operator)) return <span className="block pt-2 text-sm text-muted-foreground">{t("No value needed")}</span>;
  if (isMultiValue(c.operator)) return <MultiValue datasetKey={datasetKey} service={service} field={field} values={c.values ?? []} onChange={(values) => onChange({ ...c, values })} />;

  if (field.type === "boolean") {
    return (
      <NativeSelect value={c.value ?? "true"} onChange={(e) => onChange({ ...c, value: e.target.value })} aria-label={t("Value")}>
        <option value="true">{t("Yes")}</option>
        <option value="false">{t("No")}</option>
      </NativeSelect>
    );
  }
  if (field.type === "select") {
    return (
      <NativeSelect value={c.value ?? ""} onChange={(e) => onChange({ ...c, value: e.target.value })} aria-label={t("Value")}>
        <option value="">{t("Choose…")}</option>
        {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </NativeSelect>
    );
  }

  const type = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
  const input = (value: string | null | undefined, set: (v: string) => void, label: string) => (
    <Input type={type} value={value ?? ""} onChange={(e) => set(e.target.value)} aria-label={label} step={type === "number" ? "any" : undefined} maxLength={type === "text" ? 200 : undefined} />
  );
  if (c.operator === "between") {
    return (
      <div className="flex items-center gap-2">
        {input(c.value, (v) => onChange({ ...c, value: v }), t("From"))}
        <span className="text-sm text-muted-foreground">{t("and")}</span>
        {input(c.value2, (v) => onChange({ ...c, value2: v }), t("To"))}
      </div>
    );
  }
  return input(c.value, (v) => onChange({ ...c, value: v }), t("Value"));
}

/** Pick several values: a fixed list for choices, the distinct values in the school's own data for text columns, or typed values for looked-up columns. */
function MultiValue({ datasetKey, service, field, values, onChange }: { datasetKey: string; service?: ReportService; field: DatasetField; values: string[]; onChange: (values: string[]) => void }) {
  const { t } = useTranslation("reports");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const fixed = field.options && field.options.length > 0 ? field.options.map((o) => o.value) : null;
  const lookedUp = Boolean(field.computed);
  const found = useQuery({
    queryKey: ["custom-report-values", datasetKey, field.key, search],
    queryFn: ({ signal }) => getFieldValues(datasetKey, field.key, search, signal, service),
    enabled: open && !fixed && !lookedUp,
    staleTime: 60_000,
  });
  const all = fixed ? fixed.filter((v) => v.toLowerCase().includes(search.trim().toLowerCase())) : (found.data?.values ?? []);
  const toggle = (v: string, on: boolean) => onChange(on ? [...values, v] : values.filter((x) => x !== v));
  const addTyped = () => { const v = typed.trim(); if (v && !values.includes(v)) onChange([...values, v]); setTyped(""); };

  return (
    <div className="space-y-1.5">
      {lookedUp ? (
        <div className="flex gap-1.5">
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } }} placeholder={t("Type a value and press Enter")} aria-label={t("Value")} maxLength={200} />
          <Button type="button" variant="outline" size="sm" onClick={addTyped} disabled={!typed.trim()}>{t("Add")}</Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-full justify-between" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="truncate">{values.length === 0 ? t("Choose values…") : t("{{n}} selected", { n: values.length })}</span>
        </Button>
      )}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {values.map((v) => (
            <li key={v}><button type="button" onClick={() => toggle(v, false)} className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground" aria-label={t("Remove {{value}}", { value: v })}>{v}<X className="h-3 w-3" /></button></li>
          ))}
        </ul>
      )}
      {open && !lookedUp && (
        <div className="space-y-1.5 rounded-lg border bg-background p-2">
          <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search values…")} containerClassName="sm:w-full" />
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {found.isLoading && !fixed && <p className="p-1 text-xs text-muted-foreground">{t("Loading…")}</p>}
            {all.map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-secondary/60">
                <Checkbox checked={values.includes(v)} onCheckedChange={(on) => toggle(v, on === true)} />
                <span className="truncate">{v}</span>
              </label>
            ))}
            {!found.isLoading && all.length === 0 && <p className="p-1 text-xs text-muted-foreground">{t("No values found.")}</p>}
            {found.data?.truncated && <p className="p-1 text-xs text-muted-foreground">{t("Showing the first 100. Type to narrow the list.")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
