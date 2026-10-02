export type StudyMode = "Ask" | "Explain" | "Summarize" | "Simple" | "Examples" | "Flashcards" | "Quiz";

export interface StudyRequest {
  message: string;
  mode: StudyMode;
  conversationId?: string;
  /** Parents choose which child's class materials to use; the server re-checks the link. */
  studentId?: string;
  /** Staff only: students and parents are always pinned to their own class by the server. */
  classId?: string;
  subjectId?: string;
  documentId?: string;
}

export interface StudySource {
  documentId: string;
  documentName: string;
  page: number;
}

export interface StudyResponse {
  conversationId: string;
  answer: string;
  sources: StudySource[];
  usedMaterial: boolean;
  notice: string | null;
}

export type DocumentStatus = "Queued" | "Processing" | "Ready" | "Failed";
export type DocumentVisibility = "Class" | "StaffOnly";

export interface AiDocument {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  classId: string;
  subjectId: string;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  errorCode: string | null;
  pageCount: number;
  chunkCount: number;
  jobId: string | null;
  progress: number;
  createdAt: string;
}

export interface UploadDocumentInput {
  file: File;
  title: string;
  classId: string;
  subjectId: string;
  visibility: DocumentVisibility;
}
