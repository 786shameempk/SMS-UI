import { academicHttpClient, campusHttpClient, engagementHttpClient, financeHttpClient, meetingHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";
import { downloadReportExport, fetchAllRows, listReportCatalog, runReport } from "./api";
import { monthRange, previousAcademicYear, resolvePreset, validateRange } from "./dateRanges";
import { csvCell, formatCell, rowsToCsv } from "./format";
import { buildReportPrintHtml } from "./printReport";
import { frequentReports, matchesReport } from "./ReportLibraryTab";
import { defaultFilters, filterProblem } from "./ReportViewer";
import type { ReportColumnDef, ReportDescriptor, ReportRow } from "./types";

const columns: ReportColumnDef[] = [
  { key: "name", label: "Student", type: "text", sortable: true },
  { key: "percent", label: "% Attended", type: "percent", sortable: true },
  { key: "joined", label: "Joined", type: "date", sortable: false },
];

const descriptor = (over: Partial<ReportDescriptor> = {}): ReportDescriptor => ({
  key: "attendance.student-percentage", title: "Student Attendance", description: "d", category: "attendance", categoryTitle: "Attendance Reports",
  filters: [
    { key: "dateFrom", label: "From", type: "date", required: true },
    { key: "dateTo", label: "To", type: "date", required: true },
    { key: "classId", label: "Class", type: "select", source: "classes", required: false },
  ],
  columns, defaultSort: "percent", defaultSortDescending: false, orientation: "landscape", sensitive: false, supportsDateRange: true, ...over,
});

describe("date presets", () => {
  const wed = new Date(2026, 9, 28); // Wednesday 28 Oct 2026

  it("works out weeks (Monday to Sunday), months and quarters", () => {
    expect(resolvePreset("thisWeek", wed)).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    expect(resolvePreset("lastWeek", wed)).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(resolvePreset("lastMonth", wed)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(resolvePreset("thisQuarter", wed)).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(resolvePreset("lastQuarter", wed)).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(resolvePreset("lastQuarter", new Date(2026, 0, 15))).toEqual({ from: "2025-10-01", to: "2025-12-31" });
  });

  it("works out rolling windows and calendar years", () => {
    expect(resolvePreset("last7", wed)).toEqual({ from: "2026-10-22", to: "2026-10-28" });
    expect(resolvePreset("last30", wed)).toEqual({ from: "2026-09-29", to: "2026-10-28" });
    expect(resolvePreset("yesterday", new Date(2026, 2, 1))).toEqual({ from: "2026-02-28", to: "2026-02-28" });
    expect(resolvePreset("lastCalendarYear", wed)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("uses the school's academic years, which need not follow the calendar year", () => {
    const years = [
      { startDate: "2025-06-01", endDate: "2026-03-31" },
      { startDate: "2026-06-01", endDate: "2027-03-31", isCurrent: true },
    ];
    expect(resolvePreset("thisAcademicYear", wed, years)).toEqual({ from: "2026-06-01", to: "2027-03-31" });
    expect(resolvePreset("lastAcademicYear", wed, years)).toEqual({ from: "2025-06-01", to: "2026-03-31" });
    expect(previousAcademicYear([years[1]], wed)).toBeNull();
    expect(resolvePreset("lastAcademicYear", wed, [years[1]])).toBeNull();
    expect(resolvePreset("thisAcademicYear", wed, [])).toBeNull();
  });

  it("leaves custom and specific-month presets to the user", () => {
    expect(resolvePreset("custom", wed)).toBeNull();
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("nope")).toBeNull();
  });

  it("rejects an end date before the start date", () => {
    expect(validateRange("2026-10-10", "2026-10-01")).toMatch(/on or before/);
    expect(validateRange("2026-10-01", "2026-10-01")).toBeNull();
    expect(validateRange("", "2026-10-01")).toBeNull();
    expect(validateRange("10/10/2026", "")).toMatch(/valid/);
  });
});

describe("filters", () => {
  it("opens required date ranges on the last 30 days and flags missing or bad values", () => {
    const { filters, preset } = defaultFilters(descriptor(), new Date(2026, 9, 28));
    expect(filters).toEqual({ dateFrom: "2026-09-29", dateTo: "2026-10-28" });
    expect(preset).toBe("last30");
    expect(filterProblem(descriptor(), filters)).toBeNull();
    expect(filterProblem(descriptor(), { dateFrom: "", dateTo: "" })).toMatch(/required/);
    expect(filterProblem(descriptor(), { dateFrom: "2026-10-10", dateTo: "2026-10-01" })).toMatch(/on or before/);
  });

  it("defaults a required single date to today and a required month to this month", () => {
    const d = descriptor({ filters: [{ key: "date", label: "Date", type: "date", required: true }, { key: "month", label: "Month", type: "number", required: true }] });
    expect(defaultFilters(d, new Date(2026, 9, 28)).filters).toEqual({ date: "2026-10-28", month: "10" });
  });
});

describe("report library search", () => {
  it("matches name, description or category, ignoring case", () => {
    const r = descriptor({ title: "Daily Absentees", description: "Students marked absent", categoryTitle: "Attendance Reports" });
    expect(matchesReport(r, "absentees")).toBe(true);
    expect(matchesReport(r, "MARKED")).toBe(true);
    expect(matchesReport(r, "attendance reports")).toBe(true);
    expect(matchesReport(r, "payroll")).toBe(false);
    expect(matchesReport(r, "  ")).toBe(true);
  });
});

describe("formatting and CSV", () => {
  it("formats by column type and leaves missing values blank", () => {
    expect(formatCell("2026-10-05", "date", "en-GB")).toBe("05 Oct 2026");
    expect(formatCell(93.66, "percent", "en-US")).toBe("93.7%");
    expect(formatCell(1234, "number", "en-US")).toBe("1,234");
    expect(formatCell(null, "text")).toBe("");
  });

  it("defuses spreadsheet formulas, quotes awkward text and keeps Malayalam intact", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell("മലയാളം")).toBe("മലയാളം");
  });

  it("writes a header row, a BOM and one line per row", () => {
    const rows: ReportRow[] = [{ name: "Asha", percent: 90.5, joined: "2026-01-02" }, { name: "=evil()", percent: null, joined: null }];
    const csv = rowsToCsv(columns, rows);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).trim().split("\r\n")).toEqual(["Student,% Attended,Joined", "Asha,90.5,2026-01-02", "'=evil(),,"]);
  });
});

describe("print layout", () => {
  const rows: ReportRow[] = [{ name: "Asha <b>", percent: 90, joined: "2026-01-02" }];
  const html = (over: Record<string, unknown> = {}) =>
    buildReportPrintHtml({
      descriptor: descriptor(), rows, summary: [{ key: "t", label: "Students", value: 1, type: "number" }],
      filterLines: [{ label: "Period", text: "2026-10-01 – 2026-10-31" }], scopeLabel: "All filtered records (1)", generatedBy: "Priya",
      branding: { name: "Sunrise School", isTenant: true, address: "1 Main Road" }, generatedAt: new Date(2026, 9, 28, 9, 30), locale: "en-GB", ...over,
    });

  it("repeats the column header on every page, prints the totals once at the end, and uses the report's orientation", () => {
    const out = html();
    expect(out).toContain("thead{display:table-header-group}");
    expect(out).toContain("size:A4 landscape");
    expect(out.indexOf("<thead>")).toBeLessThan(out.indexOf("Students<b>"));
    expect(out.match(/class="sum"/g)).toHaveLength(1);
    expect(out).toContain("Sunrise School");
    expect(out).toContain("1 Main Road");
    expect(out).toContain("All filtered records (1)");
    expect(out).toContain("Priya");
    expect(out).toContain("counter(page)");
  });

  it("escapes cell text and shows a confidentiality notice only for sensitive reports", () => {
    expect(html()).not.toContain("Asha <b>");
    expect(html()).toContain("Asha &lt;b&gt;");
    expect(html()).not.toContain("CONFIDENTIAL");
    expect(html({ descriptor: descriptor({ sensitive: true }) })).toContain("CONFIDENTIAL");
  });

  it("says so when there are no records", () => {
    expect(html({ rows: [] })).toContain("No records match the selected filters.");
  });
});

describe("loading every record", () => {
  it("walks all pages with the same sort until the total is reached, reporting progress", async () => {
    const make = (n: number, from: number): ReportRow[] => Array.from({ length: n }, (_, i) => ({ name: `S${from + i}` }));
    const calls = stubClient(academicHttpClient, {
      "POST /api/reports/r1/query": (_u: string, body: unknown) => {
        const page = (body as { page: number }).page;
        return { reportKey: "r1", rows: page < 3 ? make(200, (page - 1) * 200) : make(50, 400), total: 450, page, pageSize: 200, totalPages: 3, summary: [{ key: "total", label: "Records", value: 450, type: "number" }], generatedAtUtc: "" };
      },
    });
    const progress: number[] = [];

    const result = await fetchAllRows("r1", { filters: { dateFrom: "2026-10-01", empty: "" }, sortBy: "name", sortDirection: "desc", search: "a" }, (loaded) => progress.push(loaded));

    expect(result.rows).toHaveLength(450);
    expect(new Set(result.rows.map((r) => r.name)).size).toBe(450);
    expect(result.total).toBe(450);
    expect(progress).toEqual([200, 400, 450]);
    expect(calls.map((c) => (c.body as { page: number }).page)).toEqual([1, 2, 3]);
    expect(calls[0].body).toMatchObject({ pageSize: 200, sortBy: "name", sortDirection: "desc", search: "a", filters: { dateFrom: "2026-10-01" } });
    expect((calls[0].body as { filters: Record<string, string> }).filters).not.toHaveProperty("empty");
  });

  it("marks the pages that feed a print, because printing is its own permission", async () => {
    const calls = stubClient(academicHttpClient, {
      "POST /api/reports/r3/query": { reportKey: "r3", rows: [], total: 0, page: 1, pageSize: 200, totalPages: 1, summary: [], generatedAtUtc: "" },
    });
    await fetchAllRows("r3", { filters: {}, purpose: "print" });
    await fetchAllRows("r3", { filters: {} });
    expect(calls[0].body).toMatchObject({ purpose: "print" });
    expect((calls[1].body as { purpose?: string }).purpose).toBeUndefined();
  });

  it("stops at an empty result instead of looping", async () => {
    stubClient(academicHttpClient, {
      "POST /api/reports/r2/query": { reportKey: "r2", rows: [], total: 0, page: 1, pageSize: 200, totalPages: 1, summary: [], generatedAtUtc: "" },
    });
    expect((await fetchAllRows("r2", { filters: {} })).rows).toEqual([]);
  });

  it("turns a server error into a readable message", async () => {
    vi.spyOn(academicHttpClient, "post").mockRejectedValue(
      Object.assign(new Error("x"), { isAxiosError: true, response: { status: 403, data: { title: "Your school's plan or your role does not include this report." } } }),
    );
    await expect(runReport("students.contacts", { filters: {}, page: 1, pageSize: 25 })).rejects.toThrow(/does not include this report/);
  });

  it("asks the owning service for the chosen export format and saves it under the server's file name", async () => {
    const post = vi.spyOn(financeHttpClient, "post").mockResolvedValue({ data: new Blob(["x"]), headers: { "content-disposition": 'attachment; filename="fees.collection-20261027.xlsx"' } });
    const create = vi.fn(() => "blob:x");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const name = await downloadReportExport("fees.collection", { filters: { year: "2026" }, sortBy: "name" }, "xlsx", undefined, "finance");

    expect(name).toBe("fees.collection-20261027.xlsx");
    expect(post).toHaveBeenCalledWith("/api/reports/fees.collection/export", expect.anything(), expect.objectContaining({ params: { format: "xlsx" }, responseType: "blob" }));
    expect(click).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("the report catalogue", () => {
  beforeEach(() => {
    stubClient(engagementHttpClient, {});
    stubClient(meetingHttpClient, {});
  });

  it("tags each report with the service that owns it and keeps that service's access", async () => {
    stubClient(academicHttpClient, {
      "GET /api/reports": [descriptor({ key: "students.register" })],
      "GET /api/reports/access": { canExport: true, canPrint: false, canSeeSensitive: false, canSeeAllBranches: false },
    });
    stubClient(financeHttpClient, {
      "GET /api/reports": [descriptor({ key: "fees.collection", category: "fees", categoryTitle: "Fees and Financial Reports" })],
      "GET /api/reports/access": { canExport: false, canPrint: true, canSeeSensitive: false, canSeeAllBranches: false },
    });
    stubClient(engagementHttpClient, {
      "GET /api/reports": [descriptor({ key: "comms.deliveries", category: "communication", categoryTitle: "Communication and Notification Reports" })],
      "GET /api/reports/access": { canExport: true, canPrint: true, canSeeSensitive: false, canSeeAllBranches: false },
    });
    stubClient(meetingHttpClient, {
      "GET /api/reports": [descriptor({ key: "meetings.register", category: "meetings", categoryTitle: "Online Classes and Meetings Reports" })],
      "GET /api/reports/access": { canExport: false, canPrint: true, canSeeSensitive: false, canSeeAllBranches: false },
    });
    stubClient(campusHttpClient, {
      "GET /api/reports": [descriptor({ key: "hostel.rooms", category: "hostel", categoryTitle: "Hostel Reports" })],
      "GET /api/reports/access": { canExport: true, canPrint: true, canSeeSensitive: true, canSeeAllBranches: false },
    });

    const catalog = await listReportCatalog();

    expect(catalog.reports.map((r) => [r.key, r.service])).toEqual([["students.register", "academic"], ["fees.collection", "finance"], ["hostel.rooms", "campus"], ["comms.deliveries", "engagement"], ["meetings.register", "meeting"]]);
    expect(catalog.access.campus.canSeeSensitive).toBe(true);
    expect(catalog.access.academic).toEqual({ canExport: true, canPrint: false, canSeeSensitive: false, canSeeAllBranches: false });
    expect(catalog.access.finance.canPrint).toBe(true);
    expect(catalog.access.finance.canExport).toBe(false);   // each service's own rights, never merged
  });

  it("keeps the other services' reports when one service is refusing or down", async () => {
    stubClient(academicHttpClient, {
      "GET /api/reports": [descriptor({ key: "students.register" })],
      "GET /api/reports/access": { canExport: true, canPrint: true, canSeeSensitive: false, canSeeAllBranches: false },
    });
    stubClient(campusHttpClient, {});
    vi.spyOn(financeHttpClient, "get").mockRejectedValue(
      Object.assign(new Error("x"), { isAxiosError: true, response: { status: 403, data: { title: "You don't have access to this area." } } }),
    );

    const catalog = await listReportCatalog();

    expect(catalog.reports.map((r) => r.key)).toEqual(["students.register"]);
    expect(catalog.access.finance).toBeUndefined();
  });

  it("sends a campus report to the campus service only", async () => {
    const campus = stubClient(campusHttpClient, {
      "POST /api/reports/hostel.rooms/query": { reportKey: "hostel.rooms", rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1, summary: [], generatedAtUtc: "" },
    });
    const academic = stubClient(academicHttpClient, {});
    const finance = stubClient(financeHttpClient, {});

    await runReport("hostel.rooms", { filters: {}, page: 1, pageSize: 25 }, undefined, "campus");

    expect(campus).toHaveLength(1);
    expect(academic).toHaveLength(0);
    expect(finance).toHaveLength(0);
  });

  it("sends a finance report to the finance service, not AcademicService", async () => {
    const finance = stubClient(financeHttpClient, {
      "POST /api/reports/fees.collection/query": { reportKey: "fees.collection", rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1, summary: [], generatedAtUtc: "" },
    });
    const academic = stubClient(academicHttpClient, {});

    await runReport("fees.collection", { filters: {}, page: 1, pageSize: 25 }, undefined, "finance");

    expect(finance).toHaveLength(1);
    expect(academic).toHaveLength(0);
  });

  it("offers nothing extra when the access call fails: no export, no print", async () => {
    stubClient(financeHttpClient, {});
    stubClient(campusHttpClient, {});
    vi.spyOn(academicHttpClient, "get").mockImplementation(async (url: string) => {
      if (url === "/api/reports") return { data: [descriptor()] };
      throw Object.assign(new Error("x"), { isAxiosError: true, response: { status: 500, data: {} } });
    });
    const catalog = await listReportCatalog();
    expect(catalog.access.academic).toMatchObject({ canExport: false, canPrint: false });
  });
});

describe("frequently used reports", () => {
  const reports = [descriptor({ key: "a", title: "A" }), descriptor({ key: "b", title: "B" }), descriptor({ key: "c", title: "C" }), descriptor({ key: "d", title: "D" })];

  it("lists reports opened at least twice, most used first, at most three", () => {
    expect(frequentReports(reports, { a: 2, b: 5, c: 1, d: 3 }).map((r) => r.key)).toEqual(["b", "d", "a"]);
    expect(frequentReports(reports, { a: 1 })).toEqual([]);
  });

  it("leaves out reports the login can no longer use", () => {
    expect(frequentReports(reports, { gone: 9, a: 2 }).map((r) => r.key)).toEqual(["a"]);
  });
});
