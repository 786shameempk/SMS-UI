import type { ReportColumnDef } from "../library/types";
import type {
  AggregateFunction, CustomReportDefinition, DatasetField, FieldType, FilterCondition, FilterOperator, OutputColumn, ReportSettings,
} from "./types";

export const RECORD_COUNT_KEY = "recordCount";

export const defaultSettings = (): ReportSettings => ({
  title: "",
  description: "",
  header: "",
  logoUrl: "school",
  academicYearId: null,
  dateFrom: null,
  dateTo: null,
  orientation: "portrait",
  pageSize: "A4",
  showTotalCount: true,
  showGeneratedAt: true,
  showGroupCounts: true,
  showPageNumbers: true,
  footer: "",
});

export const emptyDefinition = (): CustomReportDefinition => ({ columns: [], filters: [], groupBy: [], sort: [], aggregates: [], settings: defaultSettings() });

/** Saved definitions from an older build may lack newer settings; fill them so the builder never reads undefined. */
export const normaliseDefinition = (raw: Partial<CustomReportDefinition> | null | undefined): CustomReportDefinition => ({
  columns: raw?.columns ?? [],
  filters: raw?.filters ?? [],
  groupBy: raw?.groupBy ?? [],
  sort: raw?.sort ?? [],
  aggregates: raw?.aggregates ?? [],
  settings: { ...defaultSettings(), ...(raw?.settings ?? {}) },
});

// ── Operators ──

export const OPERATORS_BY_TYPE: Record<FieldType, FilterOperator[]> = {
  text: ["eq", "ne", "contains", "notContains", "startsWith", "endsWith", "in", "empty", "notEmpty"],
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "between", "empty", "notEmpty"],
  date: ["eq", "ne", "gt", "gte", "lt", "lte", "between", "empty", "notEmpty"],
  select: ["eq", "ne", "in", "notIn", "empty", "notEmpty"],
  boolean: ["eq"],
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "Equals",
  ne: "Does not equal",
  contains: "Contains",
  notContains: "Does not contain",
  startsWith: "Starts with",
  endsWith: "Ends with",
  gt: "Greater than",
  gte: "Greater than or equal to",
  lt: "Less than",
  lte: "Less than or equal to",
  between: "Between",
  in: "Is one of",
  notIn: "Is none of",
  empty: "Is empty",
  notEmpty: "Is not empty",
};

/** Date fields read better as "On / Before / After". */
export const DATE_OPERATOR_LABELS: Partial<Record<FilterOperator, string>> = {
  eq: "On", ne: "Not on", gt: "After", gte: "On or after", lt: "Before", lte: "On or before", between: "Between (date range)",
};

/** The operators a field offers: a column another service resolves to records only supports a few. */
export const operatorsFor = (field: DatasetField): FilterOperator[] => (field.externalFilter ? ["eq", "contains", "in"] : OPERATORS_BY_TYPE[field.type]);

export const MAX_GROUP_DEPTH = 3;

export const newGroup = (field: DatasetField, join: "and" | "or" = "and"): FilterCondition => ({ field: "", operator: "eq", join, group: [newCondition(field)] });

export const needsNoValue = (op: FilterOperator) => op === "empty" || op === "notEmpty";
export const isMultiValue = (op: FilterOperator) => op === "in" || op === "notIn";

export const AGGREGATE_LABELS: Record<AggregateFunction, string> = { count: "Count", sum: "Total", avg: "Average", min: "Lowest", max: "Highest" };

/** The calculations a field supports, mirroring the server's rule. */
export function aggregatesFor(field: DatasetField): AggregateFunction[] {
  if (field.computed) return [];
  if (field.type === "number") return field.aggregable ? ["sum", "avg", "min", "max", "count"] : [];
  if (field.type === "date") return ["min", "max", "count"];
  return ["count"];
}

export const aggregateKey = (fn: AggregateFunction, field: string) => `${fn}_${field}`;

export const newCondition = (field: DatasetField, join: "and" | "or" = "and"): FilterCondition => ({
  field: field.key,
  operator: field.type === "select" ? "eq" : field.type === "boolean" ? "eq" : field.type === "text" ? "contains" : "eq",
  value: field.type === "boolean" ? "true" : "",
  value2: "",
  values: [],
  join,
});

// ── Validation (the server checks everything again; this just keeps the wizard from sending half-built conditions) ──

/** What is missing from one condition, or null when it is complete. */
export function conditionProblem(c: FilterCondition, field: DatasetField | undefined): string | null {
  if (c.group) return null;   // a group is checked through its own conditions
  if (!field) return "This column is no longer available.";
  if (needsNoValue(c.operator)) return null;
  if (isMultiValue(c.operator)) return (c.values ?? []).length === 0 ? "Choose at least one value." : null;
  if (c.operator === "between") {
    if (!c.value || !c.value2) return "Enter both values.";
    const [a, b] = field.type === "number" ? [Number(c.value), Number(c.value2)] : [c.value, c.value2];
    if (a > b) return "The first value must not be greater than the second.";
    return null;
  }
  if (c.value === undefined || c.value === null || c.value === "") return "Enter a value.";
  if (field.type === "number" && Number.isNaN(Number(c.value))) return "Enter a number.";
  return null;
}

/** Only complete conditions on columns that still exist; this is what preview and generate send. */
export function sendableDefinition(def: CustomReportDefinition, fields: DatasetField[]): CustomReportDefinition {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  return {
    ...def,
    columns: def.columns.filter((c) => byKey.has(c.field)),
    filters: cleanFilters(def.filters, byKey),
    groupBy: def.groupBy.filter((k) => byKey.has(k)),
    sort: def.sort.filter((s) => byKey.has(s.field) || s.field === RECORD_COUNT_KEY || def.aggregates.some((a) => aggregateKey(a.function, a.field) === s.field)),
    aggregates: def.aggregates.filter((a) => byKey.has(a.field)),
    settings: {
      ...def.settings,
      academicYearId: def.settings.academicYearId || null,
      dateFrom: def.settings.dateFrom || null,
      dateTo: def.settings.dateTo || null,
    },
  };
}

/** Complete conditions on columns that still exist, recursively; a group left empty is dropped. */
function cleanFilters(list: FilterCondition[], byKey: Map<string, DatasetField>): FilterCondition[] {
  const out: FilterCondition[] = [];
  for (const c of list) {
    if (c.group) {
      const inner = cleanFilters(c.group, byKey);
      if (inner.length > 0) out.push({ field: "", operator: "eq", join: c.join ?? "and", group: inner });
    } else if (byKey.has(c.field) && conditionProblem(c, byKey.get(c.field)) === null) out.push(tidyCondition(c));
  }
  return out;
}

function tidyCondition(c: FilterCondition): FilterCondition {
  const out: FilterCondition = { field: c.field, operator: c.operator, join: c.join ?? "and" };
  if (needsNoValue(c.operator)) return out;
  if (isMultiValue(c.operator)) return { ...out, values: c.values ?? [] };
  if (c.operator === "between") return { ...out, value: c.value, value2: c.value2 };
  return { ...out, value: c.value };
}

export type WizardStep = "source" | "columns" | "filters" | "group" | "settings" | "preview";

export const WIZARD_STEPS: WizardStep[] = ["source", "columns", "filters", "group", "settings", "preview"];

export interface StepContext {
  datasetKey: string | null;
  definition: CustomReportDefinition;
  fields: DatasetField[];
}

/** Why the user cannot leave this step yet, or null. */
export function stepProblem(step: WizardStep, ctx: StepContext): string | null {
  const { definition: d, fields } = ctx;
  const byKey = new Map(fields.map((f) => [f.key, f]));
  switch (step) {
    case "source":
      return ctx.datasetKey ? null : "Choose a data source.";
    case "columns":
      return d.columns.some((c) => c.visible) || d.groupBy.length > 0 ? null : "Choose at least one column.";
    case "filters": return filtersProblem(d.filters, byKey);
    case "group": {
      for (const a of d.aggregates) if (!byKey.has(a.field)) return "A calculation uses a column that is no longer available.";
      const grouped = d.groupBy.length > 0;
      if (grouped && d.sort.some((s) => !d.groupBy.includes(s.field) && s.field !== RECORD_COUNT_KEY && !d.aggregates.some((a) => aggregateKey(a.function, a.field) === s.field)))
        return "A grouped report can only be sorted by a grouped column, the record count or a calculation.";
      return null;
    }
    case "settings": {
      const { dateFrom, dateTo } = d.settings;
      if (dateFrom && dateTo && dateFrom > dateTo) return "The date range must start on or before it ends.";
      return null;
    }
    default:
      return null;
  }
}

/** The first thing wrong in the filter tree (conditions are numbered in reading order), or null. */
export function filtersProblem(list: FilterCondition[], byKey: Map<string, DatasetField>): string | null {
  let n = 0;
  let found: string | null = null;
  const visit = (items: FilterCondition[], depth: number) => {
    for (const [i, c] of items.entries()) {
      if (found) return;
      if (c.group) { visit(c.group, depth + 1); continue; }
      n++;
      const field = byKey.get(c.field);
      const problem = conditionProblem(c, field);
      if (problem) { found = `Filter ${n}: ${problem}`; return; }
      if (field?.externalFilter && (depth > 1 || items.slice(1).some((x) => x.join === "or"))) { found = `Filter ${n}: ${field.label} can only be combined with AND, and not inside a group.`; return; }
      void i;
    }
  };
  visit(list, 1);
  return found;
}

// ── Helpers shared by the builder, preview and print ──

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Output columns to the library's column type, so the existing formatter, CSV and print layout can show them. */
export function toReportColumns(columns: OutputColumn[]): ReportColumnDef[] {
  return columns.map((c) => ({
    key: c.key,
    label: c.label,
    type: c.format === "percent" ? "percent" : c.format === "currency" ? "currency" : c.type === "number" ? "number" : c.type === "date" ? "date" : "text",
    sortable: false,
  }));
}

/** "Class equals Class 5", for the print header: only the filters actually applied; groups are shown in brackets. */
export function describeFilters(def: CustomReportDefinition, fields: DatasetField[], yearName?: string | null): { label: string; text: string }[] {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const describe = (list: FilterCondition[]): { label: string; text: string }[] => {
    const lines: { label: string; text: string }[] = [];
    for (const c of list) {
      const first = lines.length === 0;
      if (c.group) {
        const inner = describe(c.group);
        if (inner.length === 0) continue;
        lines.push({ label: first ? "Filter" : (c.join ?? "and").toUpperCase(), text: `(${inner.map((l, i) => (i === 0 ? "" : l.label + " ") + l.text).join(" ")})` });
        continue;
      }
      const field = byKey.get(c.field);
      if (!field || conditionProblem(c, field) !== null) continue;
      const op = (field.type === "date" ? DATE_OPERATOR_LABELS[c.operator] : undefined) ?? OPERATOR_LABELS[c.operator];
      const value = needsNoValue(c.operator) ? "" : isMultiValue(c.operator) ? (c.values ?? []).join(", ") : c.operator === "between" ? `${c.value} and ${c.value2}` : String(c.value);
      lines.push({ label: first ? "Filter" : (c.join ?? "and").toUpperCase(), text: `${field.label} ${op.toLowerCase()} ${value}`.trim() });
    }
    return lines;
  };
  const lines = describe(def.filters);
  if (yearName) lines.push({ label: "Academic year", text: yearName });
  const { dateFrom, dateTo } = def.settings;
  if (dateFrom || dateTo) lines.push({ label: "Period", text: `${dateFrom || "…"} to ${dateTo || "…"}` });
  return lines;
}
