/** Readable names for AiService feature keys; unknown keys are shown as they come. */
export const FEATURE_LABELS: Record<string, string> = {
  chat: "Ask School AI",
  "parent-assistant": "Parent assistant",
  "study-assistant": "Study assistant",
  "generate-questions": "Question generator",
  "generate-exam": "Exam paper generator",
  "generate-worksheet": "Worksheet generator",
  "generate-lesson-plan": "Lesson plan generator",
  "generate-homework": "Homework generator",
  "report-card-comment": "Report card remarks",
  "analyze-exam": "Exam insights",
  "analyze-performance": "Performance analysis",
  "upload-document": "Study material indexing",
  "embed-document": "Study material indexing",
  "conversation-summary": "Conversation memory",
  translate: "Translation",
};

export const featureLabel = (key: string) => FEATURE_LABELS[key] ?? key;

/** Roles AiService treats as admin level for the usage report. */
export const USAGE_ROLES = ["superAdmin", "admin", "principal"];
