import { describe, expect, it } from "vitest";
import {
  filtersProblem, newGroup, operatorsFor, RECORD_COUNT_KEY, aggregatesFor, conditionProblem, describeFilters, emptyDefinition, moveItem, newCondition, normaliseDefinition, sendableDefinition, stepProblem, toReportColumns,
} from "./definition";
import type { DatasetField, FilterCondition } from "./types";

const field = (key: string, type: DatasetField["type"], extra: Partial<DatasetField> = {}): DatasetField => ({
  key, label: key[0].toUpperCase() + key.slice(1), type, group: "Student", sensitive: false, aggregable: type === "number", groupable: type !== "date", ...extra,
});
const fields = [field("className", "text"), field("age", "number"), field("admitted", "date"), field("status", "select", { options: [{ value: "Active", label: "Active" }] }), field("uses", "boolean"), field("pct", "number", { aggregable: false })];
const cond = (over: Partial<FilterCondition>): FilterCondition => ({ field: "className", operator: "eq", value: "Class 5", join: "and", ...over });

describe("conditionProblem", () => {
  const f = (key: string) => fields.find((x) => x.key === key);
  it("accepts complete conditions and ones that need no value", () => {
    expect(conditionProblem(cond({}), f("className"))).toBeNull();
    expect(conditionProblem(cond({ operator: "empty", value: "" }), f("className"))).toBeNull();
    expect(conditionProblem(cond({ field: "status", operator: "in", values: ["Active"] }), f("status"))).toBeNull();
  });
  it("explains what is missing", () => {
    expect(conditionProblem(cond({ value: "" }), f("className"))).toMatch(/value/i);
    expect(conditionProblem(cond({ operator: "in", values: [] }), f("className"))).toMatch(/at least one/i);
    expect(conditionProblem(cond({ field: "age", operator: "eq", value: "abc" }), f("age"))).toMatch(/number/i);
    expect(conditionProblem(cond({ field: "age", operator: "between", value: "10", value2: "" }), f("age"))).toMatch(/both/i);
    expect(conditionProblem(cond({ field: "age", operator: "between", value: "20", value2: "10" }), f("age"))).toMatch(/greater/i);
    expect(conditionProblem(cond({ field: "gone" }), undefined)).toMatch(/no longer/i);
  });
  it("compares numbers as numbers, not text", () => {
    expect(conditionProblem(cond({ field: "age", operator: "between", value: "9", value2: "10" }), f("age"))).toBeNull();
  });
});

describe("sendableDefinition", () => {
  it("drops half-built conditions and columns that no longer exist, and strips unused values", () => {
    const def = emptyDefinition();
    def.columns = [{ field: "className", visible: true }, { field: "gone", visible: true }];
    def.filters = [cond({}), cond({ value: "" }), cond({ field: "gone" }), cond({ field: "status", operator: "empty", value: "x", values: ["a"] })];
    def.settings.academicYearId = "";
    const sent = sendableDefinition(def, fields);
    expect(sent.columns.map((c) => c.field)).toEqual(["className"]);
    expect(sent.filters).toHaveLength(2);
    expect(sent.filters[1]).toEqual({ field: "status", operator: "empty", join: "and" });
    expect(sent.settings.academicYearId).toBeNull();
  });
  it("keeps sorts by the record count and by a calculation in a grouped report", () => {
    const def = emptyDefinition();
    def.groupBy = ["className"];
    def.aggregates = [{ field: "age", function: "avg" }];
    def.sort = [{ field: RECORD_COUNT_KEY, direction: "desc" }, { field: "avg_age", direction: "asc" }, { field: "ghost", direction: "asc" }];
    expect(sendableDefinition(def, fields).sort.map((s) => s.field)).toEqual([RECORD_COUNT_KEY, "avg_age"]);
  });
});

describe("stepProblem", () => {
  const ctx = (over = {}) => ({ datasetKey: "students", definition: emptyDefinition(), fields, ...over });
  it("needs a source, then at least one column (or a grouping)", () => {
    expect(stepProblem("source", ctx({ datasetKey: null }))).toMatch(/data source/i);
    expect(stepProblem("columns", ctx())).toMatch(/column/i);
    const withColumn = emptyDefinition();
    withColumn.columns = [{ field: "className", visible: true }];
    expect(stepProblem("columns", ctx({ definition: withColumn }))).toBeNull();
    const grouped = emptyDefinition();
    grouped.groupBy = ["className"];
    expect(stepProblem("columns", ctx({ definition: grouped }))).toBeNull();
  });
  it("blocks the filter step on an incomplete condition and names which", () => {
    const def = emptyDefinition();
    def.filters = [cond({}), cond({ value: "" })];
    expect(stepProblem("filters", ctx({ definition: def }))).toMatch(/Filter 2/);
  });
  it("refuses a grouped report sorted by an ungrouped column, and a backwards date range", () => {
    const def = emptyDefinition();
    def.groupBy = ["className"];
    def.sort = [{ field: "age", direction: "asc" }];
    expect(stepProblem("group", ctx({ definition: def }))).toMatch(/grouped report/i);
    const range = emptyDefinition();
    range.settings.dateFrom = "2026-05-01";
    range.settings.dateTo = "2026-04-01";
    expect(stepProblem("settings", ctx({ definition: range }))).toMatch(/range/i);
  });
});

describe("filter groups", () => {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const group = (...items: FilterCondition[]): FilterCondition => ({ field: "", operator: "eq", join: "and", group: items });

  it("sendableDefinition keeps complete conditions inside groups, and drops empty groups", () => {
    const def = emptyDefinition();
    def.filters = [cond({}), group(cond({ value: "" }), cond({ field: "age", operator: "gt", value: "5", join: "or" })), group(cond({ value: "" }))];
    const sent = sendableDefinition(def, fields);
    expect(sent.filters).toHaveLength(2);
    expect(sent.filters[1].group).toEqual([{ field: "age", operator: "gt", join: "or", value: "5" }]);
  });
  it("numbers conditions in reading order and names the first problem, including inside a group", () => {
    expect(filtersProblem([cond({}), group(cond({}), cond({ value: "" }))], byKey)).toMatch(/Filter 3/);
    expect(filtersProblem([cond({}), group(cond({}))], byKey)).toBeNull();
  });
  it("describeFilters brackets a group", () => {
    const def = emptyDefinition();
    def.filters = [cond({}), group(cond({ field: "age", operator: "lt", value: "5" }), cond({ field: "age", operator: "gt", value: "50", join: "or" }))];
    expect(describeFilters(def, fields).map((l) => l.text)).toEqual(["ClassName equals Class 5", "(Age less than 5 OR Age greater than 50)"]);
  });
  it("newGroup starts with one condition", () => {
    expect(newGroup(fields[0]).group).toHaveLength(1);
  });
});

describe("looked-up (computed) columns", () => {
  const looked = field("studentName", "text", { computed: true, externalFilter: true, groupable: false });
  const shown = field("className", "text", { computed: true, groupable: false });
  it("only offers the operators the owning service can resolve, and no totals", () => {
    expect(operatorsFor(looked)).toEqual(["eq", "contains", "in"]);
    expect(aggregatesFor(shown)).toEqual([]);
  });
  it("can only be combined with AND, and not inside a group", () => {
    const byKey = new Map([[looked.key, looked]]);
    const c = (over: Partial<FilterCondition> = {}): FilterCondition => ({ field: "studentName", operator: "contains", value: "Asha", join: "and", ...over });
    expect(filtersProblem([c()], byKey)).toBeNull();
    expect(filtersProblem([c(), c({ join: "or" })], byKey)).toMatch(/AND/);
    expect(filtersProblem([{ field: "", operator: "eq", join: "and", group: [c()] }], byKey)).toMatch(/AND/);
  });
});

describe("aggregatesFor", () => {
  it("allows totals only where the server does", () => {
    expect(aggregatesFor(fields[1])).toEqual(["sum", "avg", "min", "max", "count"]);
    expect(aggregatesFor(fields[5])).toEqual([]);
    expect(aggregatesFor(fields[2])).toEqual(["min", "max", "count"]);
    expect(aggregatesFor(fields[0])).toEqual(["count"]);
  });
});

describe("helpers", () => {
  it("moveItem reorders without mutating, and ignores bad indexes", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a"]);
    expect(list).toEqual(["a", "b", "c"]);
    expect(moveItem(list, 1, 9)).toBe(list);
  });
  it("newCondition starts each type on a sensible operator", () => {
    expect(newCondition(fields[0]).operator).toBe("contains");
    expect(newCondition(fields[3]).operator).toBe("eq");
    expect(newCondition(fields[4])).toMatchObject({ operator: "eq", value: "true" });
  });
  it("normaliseDefinition fills settings an older saved report lacks", () => {
    const def = normaliseDefinition({ columns: [{ field: "x", visible: true }], settings: { orientation: "landscape" } as never });
    expect(def.settings.pageSize).toBe("A4");
    expect(def.settings.orientation).toBe("landscape");
    expect(def.filters).toEqual([]);
  });
  it("toReportColumns maps formats to the library's column types", () => {
    expect(toReportColumns([
      { key: "a", label: "A", type: "number", format: "percent" }, { key: "b", label: "B", type: "date" }, { key: "c", label: "C", type: "select" }, { key: "d", label: "D", type: "number" },
    ]).map((c) => c.type)).toEqual(["percent", "date", "text", "number"]);
  });
  it("describeFilters lists only complete filters, with AND/OR and the period", () => {
    const def = emptyDefinition();
    def.filters = [cond({}), cond({ field: "age", operator: "lt", value: "75", join: "or" }), cond({ value: "" })];
    def.settings.dateFrom = "2026-04-01";
    const lines = describeFilters(def, fields, "2026-27");
    expect(lines.map((l) => l.text)).toEqual(["ClassName equals Class 5", "Age less than 75", "2026-27", "2026-04-01 to …"]);
    expect(lines[1].label).toBe("OR");
  });
});
