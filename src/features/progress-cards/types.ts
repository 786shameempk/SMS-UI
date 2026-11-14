export type SectionType = "header" | "student" | "marks" | "summary" | "attendance" | "coscholastic" | "remarks" | "text" | "signatures" | "table" | "termMarks" | "termChart" | "gradeKey";

export interface LayoutSection {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
  props: Record<string, unknown>;
}

export interface TemplateConfig {
  page: { size: "A4" | "A5"; orientation: "portrait" | "landscape"; margin: number };
  style: { font: string; fontSize: number; primary: string; border: string; headerBg: string };
  sections: LayoutSection[];
}

export interface TemplateSummary {
  id: string | null;
  systemKey: string | null;
  name: string;
  board: string;
  category: string | null;
  classFrom: number | null;
  classTo: number | null;
  type: "System" | "School";
  status: "Active" | "Inactive" | "Archived";
  version: number;
  guidelineYear: string | null;
  description: string | null;
  updatedAt: string | null;
  isAssigned: boolean;
}

export interface TemplateVersion {
  version: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface TemplateDetail {
  summary: TemplateSummary;
  config: TemplateConfig;
  versions: TemplateVersion[];
}

export interface GradeBand {
  grade: string;
  min: number;
  point: number;
}

export interface SchemeConfig {
  mode: "Marks" | "Grade" | "Percentage";
  bands: GradeBand[];
  rounding: { decimals: number; mode: "nearest" | "up" | "down" };
  passPercent: number;
  resultRule: "AllSubjects" | "Percentage";
  rankEnabled: boolean;
}

export interface GradingScheme {
  id: string | null;
  systemKey: string | null;
  name: string;
  board: string;
  type: "System" | "School";
  status: string;
  isVerified: boolean;
  verifiedAt: string | null;
  note: string | null;
  config: SchemeConfig;
}

export interface Assignment {
  id: string;
  templateId: string;
  templateName: string;
  gradingSchemeId: string | null;
  schemeName: string | null;
  classId: string | null;
  className: string | null;
  examType: string | null;
  academicYearId: string | null;
  isDefault: boolean;
}

export interface SubjectPart {
  examName: string; obtained: number; max: number; weight: number; absent: boolean;
  /** Class average / highest for this exam, as a percentage of its max. */
  classAvg?: number | null; classTop?: number | null;
}

export interface CardSubject {
  name: string;
  code: string;
  max: number;
  obtained: number;
  internal: number | null;
  internalMax: number | null;
  external: number | null;
  externalMax: number | null;
  percentage: number;
  grade: string | null;
  gradePoint: number | null;
  passed: boolean;
  absent: boolean;
  passMarks: number;
  optional?: boolean;
  additional?: boolean;
  remark?: string | null;
  parts?: SubjectPart[] | null;
}

export interface CardData {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  section: string;
  rollNumber: string | null;
  dateOfBirth: string | null;
  guardian: string | null;
  photoUrl: string | null;
  examName: string;
  academicYear: string | null;
  termName: string | null;
  subjects: CardSubject[];
  total: number;
  totalMax: number;
  percentage: number;
  grade: string | null;
  gpa: number | null;
  rank: number;
  classAverage: number;
  result: "Pass" | "Fail";
  daysPresent: number | null;
  daysTotal: number | null;
  remarks: string | null;
  schemeName: string;
  schemeMode: string;
  coScholastic?: { area: string; grade: string | null; remark: string | null; examName?: string | null }[] | null;
  fatherName?: string | null;
  motherName?: string | null;
  /** The grading scheme's bands (lower bound as a percentage); empty in Marks mode. */
  bands?: { grade: string; min: number }[] | null;
}

export interface ValidationIssue {
  severity: "Error" | "Warning";
  studentId: string | null;
  studentName: string | null;
  message: string;
}

export interface GeneratedCard {
  issueId: string | null;
  status: string | null;
  data: CardData;
}

export interface GenerateResult {
  templateId: string;
  templateName: string;
  templateVersion: number;
  schemeId: string;
  schemeName: string;
  config: TemplateConfig;
  cards: GeneratedCard[];
  issues: ValidationIssue[];
  saved: boolean;
}

export interface IssueSummary {
  id: string;
  examId: string;
  examName: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  status: "Draft" | "Approved" | "Published";
  templateName: string;
  templateVersion: number;
  generatedAt: string;
  publishedAt: string | null;
}

export interface IssueDetail {
  summary: IssueSummary;
  config: TemplateConfig;
  data: CardData;
}

export interface AuditEntry {
  subject: string;
  action: string;
  detail: string | null;
  at: string;
}
