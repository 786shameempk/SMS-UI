export type ContentKind = "Notice" | "Message" | "LessonPlan" | "Worksheet" | "QuestionSet" | "Homework";
export type ContentStatus = "Draft" | "Reviewed" | "Approved" | "Published";
/** Workflow actions. The server decides which are allowed for this user now (allowedActions); there is no "set status". */
export type ContentAction = "MarkReviewed" | "Approve" | "SendBack" | "Publish";

export interface ContentHistoryEntry {
  action: string;
  fromStatus: ContentStatus | null;
  toStatus: ContentStatus;
  actorUserId: string;
  actorRole: string;
  comment: string | null;
  at: string;
}

export interface ContentSummary {
  id: string;
  kind: ContentKind;
  status: ContentStatus;
  title: string;
  aiGenerated: boolean;
  isMine: boolean;
  createdByRole: string;
  updatedAt: string;
  version: number;
  allowedActions: ContentAction[];
}

export interface ContentItem extends ContentSummary {
  body: string;
  audience: string | null;
  metadata: string | null;
  sourceFeature: string | null;
  createdByUserId: string;
  createdAt: string;
  publishedAt: string | null;
  publishedTarget: string | null;
  canEdit: boolean;
  history: ContentHistoryEntry[];
}

export interface CreateContentRequest {
  kind: ContentKind;
  title: string;
  body: string;
  audience?: string | null;
  metadata?: string | null;
  aiGenerated: boolean;
  sourceFeature?: string;
}
