/** Shapes of AcademicService's /api/custom-reports contract (camelCase JSON). */

export type FieldType = "text" | "number" | "date" | "select" | "boolean";

export interface DatasetFieldOption {
  value: string;
  label: string;
}

export interface DatasetField {
  key: string;
  label: string;
  type: FieldType;
  /** The entity the value comes from (Student, Class, Parent ...): related-entity fields sit under their own heading. */
  group: string;
  sensitive: boolean;
  options?: DatasetFieldOption[] | null;
  /** Numbers that may be totalled (sum, average, lowest, highest). */
  aggregable: boolean;
  groupable: boolean;
  format?: "percent" | "currency" | null;
  hint?: string | null;
  /** Filled in from another service for the rows being shown: it can be shown (and sometimes filtered) but not sorted, grouped or totalled. */
  computed?: boolean;
  /** A computed column that can narrow the report; the owning service resolves it to records first. */
  externalFilter?: boolean;
}

export interface DatasetDescriptor {
  key: string;
  title: string;
  description: string;
  category: string;
  fields: DatasetField[];
  dateFieldLabel?: string | null;
  /** Which service owns the data (set by the client from where the catalogue came from): academic, finance or campus. */
  service?: ReportService;
}

export type ReportService = "academic" | "finance" | "campus";

export interface ServiceAccess {
  canExport: boolean;
  canPrint: boolean;
  canSeeSensitive: boolean;
}

export interface DatasetCatalog {
  datasets: DatasetDescriptor[];
  /** What this login may do with reports, per owning service. */
  access: Record<string, ServiceAccess>;
  /** Services that could not be reached, so the page can say some data sources are missing. */
  unavailable: ReportService[];
}

export type FilterOperator =
  | "eq" | "ne" | "contains" | "notContains" | "startsWith" | "endsWith"
  | "gt" | "gte" | "lt" | "lte" | "between" | "in" | "notIn" | "empty" | "notEmpty";

export type AggregateFunction = "count" | "sum" | "avg" | "min" | "max";

export interface ColumnSpec {
  field: string;
  label?: string | null;
  visible: boolean;
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: string | null;
  value2?: string | null;
  values?: string[] | null;
  /** How this condition joins the one before it. AND binds tighter than OR. */
  join?: "and" | "or" | null;
  /** When set, this entry is a bracketed group of conditions (which may nest) and the field and operator are ignored. */
  group?: FilterCondition[] | null;
}

export interface SortSpec {
  field: string;
  direction: "asc" | "desc";
}

export interface AggregateSpec {
  field: string;
  function: AggregateFunction;
  label?: string | null;
}

export interface ReportSettings {
  title?: string | null;
  description?: string | null;
  header?: string | null;
  /** "school" prints the school logo; empty prints none. */
  logoUrl?: string | null;
  academicYearId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  orientation: "portrait" | "landscape";
  pageSize: "A4" | "A3" | "Letter";
  showTotalCount: boolean;
  showGeneratedAt: boolean;
  showGroupCounts: boolean;
  showPageNumbers: boolean;
  footer?: string | null;
}

export interface CustomReportDefinition {
  columns: ColumnSpec[];
  filters: FilterCondition[];
  groupBy: string[];
  sort: SortSpec[];
  aggregates: AggregateSpec[];
  settings: ReportSettings;
}

export type CellValue = string | number | boolean | null;

export interface OutputColumn {
  key: string;
  label: string;
  type: FieldType;
  format?: "percent" | "currency" | null;
}

export interface SummaryItem {
  key: string;
  label: string;
  value: CellValue;
  type: string;
}

export interface CustomReportPage {
  columns: OutputColumn[];
  rows: Record<string, CellValue>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  grouped: boolean;
  summary: SummaryItem[];
  generatedAtUtc: string;
}

export interface CustomReportSummary {
  id: string;
  name: string;
  description?: string | null;
  datasetKey: string;
  datasetTitle: string;
  ownerName?: string | null;
  isOwner: boolean;
  canEdit: boolean;
  visibility: "Private" | "Shared";
  lastRunAt?: string | null;
  runCount: number;
  isFavourite: boolean;
  isDefault: boolean;
  shareCount: number;
  updatedAt: string;
}

export type ShareLevel = "Run" | "Edit";

export interface ReportShare {
  targetType: "User" | "Role";
  target: string;
  targetLabel?: string | null;
  level: ShareLevel;
}

export interface CustomReportDetail {
  summary: CustomReportSummary;
  definition: CustomReportDefinition;
  shares: ReportShare[];
}

export interface AuditEntry {
  action: string;
  userId?: string | null;
  detail?: string | null;
  at: string;
}

export interface FieldValues {
  values: string[];
  truncated: boolean;
}

export type ListScope = "all" | "mine" | "shared" | "favourites";

export const CUSTOM_PAGE_SIZES = [10, 25, 50, 100, 200] as const;
