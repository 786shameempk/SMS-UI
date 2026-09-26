import {
  BookOpen,
  ClipboardCheck,
  FileKey2,
  FileQuestion,
  FileText,
  History,
  Library,
  NotebookPen,
  Presentation,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { BadgeVariant } from "@/components/ui/badge";
import type { StudyMaterialAudience, StudyMaterialCategory, StudyMaterialStatus } from "./types";

export const CATEGORY_CONFIG: Record<StudyMaterialCategory, { label: string; icon: LucideIcon }> = {
  notes: { label: "Notes", icon: NotebookPen },
  textbook: { label: "Textbook / E-book", icon: BookOpen },
  worksheet: { label: "Worksheet", icon: FileText },
  assignment: { label: "Assignment", icon: ClipboardCheck },
  questionPaper: { label: "Question paper", icon: FileQuestion },
  previousYearPaper: { label: "Previous year paper", icon: History },
  answerKey: { label: "Answer key", icon: FileKey2 },
  video: { label: "Video", icon: Video },
  presentation: { label: "Presentation", icon: Presentation },
  reference: { label: "Reference", icon: Library },
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_CONFIG) as StudyMaterialCategory[]).map((value) => ({
  value,
  label: CATEGORY_CONFIG[value].label,
}));

export const AUDIENCE_LABEL: Record<StudyMaterialAudience, string> = {
  allStudents: "All students",
  class: "One class",
  section: "One section",
};

export const STATUS_CONFIG: Record<StudyMaterialStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "neutral" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "default" },
};

/** Matches AcademicService StudyMaterialRules (checked server-side too, by extension and file signature). */
export const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt"];
export const MAX_FILE_MB = 50;

export function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Short, readable file type for a badge ("PDF", "DOCX", "Link"). */
export function fileKind(m: { fileName?: string; linkUrl?: string }): string {
  const ext = m.fileName?.split(".").pop();
  if (ext) return ext.toUpperCase();
  if (m.linkUrl && /youtu\.?be|vimeo/i.test(m.linkUrl)) return "Video link";
  return m.linkUrl ? "Link" : "";
}
