import { BookOpen, FileText, MessagesSquare, Presentation, Video } from "lucide-react";
import type { HomeworkStatus, ResourceType, SubmissionStatus } from "./types";

export const HOMEWORK_STATUSES: Array<{ value: HomeworkStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, { label: string; variant: BadgeVariant }> = {
  not_submitted: { label: "Not submitted", variant: "neutral" },
  submitted: { label: "Submitted", variant: "info" },
  graded: { label: "Graded", variant: "success" },
  resubmit_requested: { label: "Resubmit requested", variant: "warning" },
};

export const RESOURCE_TYPES: Array<{ value: ResourceType; label: string }> = [
  { value: "video", label: "Video" },
  { value: "notes", label: "Notes" },
  { value: "pdf", label: "PDF" },
  { value: "ppt", label: "Slides (PPT)" },
  { value: "quiz", label: "Quiz" },
  { value: "discussion", label: "Discussion" },
];

export const RESOURCE_TYPE_ICONS: Record<ResourceType, typeof Video> = {
  video: Video,
  notes: FileText,
  pdf: FileText,
  ppt: Presentation,
  quiz: BookOpen,
  discussion: MessagesSquare,
};

export const QUIZ_OPTION_COUNT = 4;
export const MIN_QUIZ_QUESTIONS = 1;
export const MAX_QUIZ_QUESTIONS = 8;
