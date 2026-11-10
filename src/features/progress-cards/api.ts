import axios from "axios";
import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  Assignment, AuditEntry, GenerateResult, GradingScheme, IssueDetail, IssueSummary, SchemeConfig, TemplateConfig, TemplateDetail, TemplateSummary,
} from "./types";

const BASE = "/api/progress-cards";

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    throw new Error(extractApiErrorMessage(err));
  }
}

export interface TemplateInput {
  name: string;
  description?: string | null;
  board: string;
  category?: string | null;
  classFrom?: number | null;
  classTo?: number | null;
  note?: string | null;
  config: TemplateConfig;
}

export const listTemplates = () => unwrap(academicHttpClient.get<TemplateSummary[]>(`${BASE}/templates`));
export const getSystemTemplate = (key: string) => unwrap(academicHttpClient.get<TemplateDetail>(`${BASE}/templates/system/${key}`));
export const getTemplate = (id: string, version?: number) => unwrap(academicHttpClient.get<TemplateDetail>(`${BASE}/templates/${id}`, { params: { version } }));
export const copySystemTemplate = (key: string, name?: string) =>
  unwrap(academicHttpClient.post<TemplateDetail>(`${BASE}/templates`, { name: name ?? "", board: "" }, { params: { fromSystemKey: key } }));
export const createTemplate = (input: TemplateInput) => unwrap(academicHttpClient.post<TemplateDetail>(`${BASE}/templates`, input));
export const updateTemplate = (id: string, input: TemplateInput) => unwrap(academicHttpClient.put<TemplateDetail>(`${BASE}/templates/${id}`, input));
export const setTemplateStatus = (id: string, status: "Active" | "Inactive" | "Archived") => unwrap(academicHttpClient.put<void>(`${BASE}/templates/${id}/status`, { status }));

export const listSchemes = () => unwrap(academicHttpClient.get<GradingScheme[]>(`${BASE}/grading-schemes`));
export const copySystemScheme = (key: string) =>
  unwrap(academicHttpClient.post<GradingScheme>(`${BASE}/grading-schemes`, { name: "", board: "" }, { params: { fromSystemKey: key } }));
export const updateScheme = (id: string, input: { name: string; board: string; config: SchemeConfig }) => unwrap(academicHttpClient.put<GradingScheme>(`${BASE}/grading-schemes/${id}`, input));
export const verifyScheme = (id: string) => unwrap(academicHttpClient.post<GradingScheme>(`${BASE}/grading-schemes/${id}/verify`));
export const archiveScheme = (id: string) => unwrap(academicHttpClient.delete<void>(`${BASE}/grading-schemes/${id}`));

export const listAssignments = () => unwrap(academicHttpClient.get<Assignment[]>(`${BASE}/assignments`));
export const saveAssignment = (input: { templateId: string; gradingSchemeId: string | null; classId: string | null; examType: string | null; isDefault: boolean }) =>
  unwrap(academicHttpClient.post<Assignment[]>(`${BASE}/assignments`, input));
export const deleteAssignment = (id: string) => unwrap(academicHttpClient.delete<void>(`${BASE}/assignments/${id}`));

export interface GenerateInput {
  examId: string;
  templateId?: string | null;
  gradingSchemeId?: string | null;
  studentIds?: string[];
  components?: { examId: string; weight: number }[];
  previewOnly: boolean;
}
export const generateCards = (input: GenerateInput) => unwrap(academicHttpClient.post<GenerateResult>(`${BASE}/generate`, input));
export const listIssues = (params: { examId?: string; status?: string }) => unwrap(academicHttpClient.get<IssueSummary[]>(`${BASE}/issues`, { params }));
export const changeIssueStatus = (ids: string[], action: "approve" | "publish" | "unpublish") =>
  unwrap(academicHttpClient.post<{ changed: number }>(`${BASE}/issues/status`, { ids, action }));
export const getIssue = (id: string) => unwrap(academicHttpClient.get<IssueDetail>(`${BASE}/issues/${id}`));
export const listMine = () => unwrap(academicHttpClient.get<IssueSummary[]>(`${BASE}/mine`));
export const listAudit = () => unwrap(academicHttpClient.get<AuditEntry[]>(`${BASE}/audit`));

// ── Weighting, subject rules, co-scholastic, files ─────────────────────────────────────────────────────────

export interface SubjectRule {
  id: string | null;
  subjectId: string;
  subjectName: string;
  classId: string | null;
  isOptional: boolean;
  isAdditional: boolean;
  gradingSchemeId: string | null;
}
export const listSubjectRules = () => unwrap(academicHttpClient.get<SubjectRule[]>(`${BASE}/subject-rules`));
export const saveSubjectRule = (input: { subjectId: string; classId: string | null; isOptional: boolean; isAdditional: boolean; gradingSchemeId: string | null }) =>
  unwrap(academicHttpClient.post<SubjectRule[]>(`${BASE}/subject-rules`, input));

export interface CoEntry { studentId: string; kind: "Area" | "Subject"; area: string; grade: string | null; remark: string | null }
export interface CoSheet {
  examId: string;
  examName: string;
  areas: string[];
  subjects: { id: string; name: string }[];
  students: { id: string; name: string; rollNumber: string | null; section: string }[];
  entries: CoEntry[];
}
export const getCoScholastic = (examId: string) => unwrap(academicHttpClient.get<CoSheet>(`${BASE}/coscholastic/${examId}`));
export const saveCoScholastic = (examId: string, entries: CoEntry[]) => unwrap(academicHttpClient.put<{ changed: number }>(`${BASE}/coscholastic/${examId}`, entries));

async function download(request: Promise<{ data: Blob; headers: Record<string, unknown> }>, fallback: string): Promise<void> {
  try {
    const res = await request;
    const { saveBlob } = await import("@/features/reports/library/api");
    saveBlob(res.data, fallback);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        const json = JSON.parse(await err.response.data.text()) as { title?: string; errors?: Record<string, string[]> | null };
        throw new Error([json.title, json.errors ? Object.values(json.errors).flat().join(" ") : ""].filter(Boolean).join(" "));
      } catch (inner) {
        if (inner instanceof Error && !(inner instanceof SyntaxError)) throw inner;
      }
    }
    throw new Error(extractApiErrorMessage(err));
  }
}

export const downloadIssuePdf = (id: string, name: string) => download(academicHttpClient.get(`${BASE}/issues/${id}/pdf`, { responseType: "blob" }), `${name}.pdf`);
export const downloadExport = (ids: string[], mode: "pdf" | "zip") =>
  download(academicHttpClient.post(`${BASE}/export`, { ids, mode }, { responseType: "blob" }), mode === "zip" ? "progress-cards.zip" : "progress-cards.pdf");
export const downloadPreviewPdf = (input: GenerateInput) => download(academicHttpClient.post(`${BASE}/generate/pdf`, input, { responseType: "blob" }), "progress-cards-preview.pdf");
