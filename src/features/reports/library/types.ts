/** Shapes of AcademicService's /api/reports contract (camelCase JSON). */

export interface ReportOption {
  value: string;
  label: string;
}

export type ReportFilterType = "select" | "date" | "text" | "number";

export interface ReportFilterDef {
  key: string;
  label: string;
  type: ReportFilterType;
  /** A list the client already loads: "academicYears", "classes", "sections", "branches", "terms", "exams" or "subjects". */
  source?: string | null;
  options?: ReportOption[] | null;
  required: boolean;
}

export type ReportColumnType = "text" | "date" | "number" | "percent" | "currency";

export interface ReportColumnDef {
  key: string;
  label: string;
  type: ReportColumnType;
  sortable: boolean;
}

export interface ReportDescriptor {
  key: string;
  title: string;
  description: string;
  category: string;
  categoryTitle: string;
  filters: ReportFilterDef[];
  columns: ReportColumnDef[];
  defaultSort: string;
  defaultSortDescending: boolean;
  orientation: "portrait" | "landscape";
  sensitive: boolean;
  supportsDateRange: boolean;
}

export type ReportRow = Record<string, string | number | boolean | null>;

export interface ReportSummaryItem {
  key: string;
  label: string;
  value: string | number | null;
  type: "number" | "percent" | "currency" | string;
}

export interface ReportPage {
  reportKey: string;
  rows: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: ReportSummaryItem[];
  generatedAtUtc: string;
}

export interface ReportQuery {
  filters: Record<string, string>;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  search?: string;
}

export const PAGE_SIZES = [10, 25, 50, 100, 200] as const;
