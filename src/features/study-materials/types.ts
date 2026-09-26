export type StudyMaterialCategory =
  | "notes"
  | "textbook"
  | "worksheet"
  | "assignment"
  | "questionPaper"
  | "previousYearPaper"
  | "answerKey"
  | "video"
  | "presentation"
  | "reference";

/** Inside the uploader's school: everyone, one class, or one section. Platform materials are always everyone. */
export type StudyMaterialAudience = "allStudents" | "class" | "section";

export type StudyMaterialStatus = "draft" | "published" | "archived";

export interface StudyMaterialPermissions {
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canDelete: boolean;
  canPin: boolean;
}

export interface StudyMaterial {
  id: string;
  tenantId: string;
  /** Uploaded by the platform SuperAdmin and shared with every school. */
  isGlobal: boolean;
  title: string;
  description?: string;
  category: StudyMaterialCategory;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  /** Class name, or a free-text grade label on platform materials. */
  className?: string;
  sectionName?: string;
  /** Subject name, or a free-text subject label on platform materials. */
  subjectName?: string;
  chapter?: string;
  audience: StudyMaterialAudience;
  status: StudyMaterialStatus;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
  availableFrom?: string;
  availableUntil?: string;
  /** Published, but students can't see it until availableFrom. */
  isScheduled: boolean;
  isPinned: boolean;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedByRole: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  isPreviewable: boolean;
  /** Absolute, short-lived signed URLs (null for link-only materials). */
  viewUrl?: string;
  downloadUrl?: string;
  linkUrl?: string;
  viewCount: number;
  downloadCount: number;
  permissions: StudyMaterialPermissions;
}

export interface StudyMaterialFormValues {
  title: string;
  description?: string;
  category: StudyMaterialCategory;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  /** Platform materials only. */
  gradeLabel?: string;
  subjectLabel?: string;
  chapter?: string;
  audience: StudyMaterialAudience;
  availableFrom?: string;
  availableUntil?: string;
  linkUrl?: string;
}

export interface StudyMaterialFilters {
  view: "browse" | "mine";
  status?: StudyMaterialStatus;
  category?: StudyMaterialCategory;
  classId?: string;
  subjectId?: string;
  scope?: "school" | "platform";
  search?: string;
}

export interface StudyMaterialCounts {
  drafts: number;
  published: number;
  archived: number;
}
