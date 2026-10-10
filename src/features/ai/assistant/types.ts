import type { HelpReply } from "@/features/help/assistant";
import type { NavigationAction } from "@/features/help/navigation";

export type AssistantSource = "timetable" | "attendance" | "fees" | "exams" | "notices" | "homework" | "materials" | "admissions" | "at-risk students" | "leave" | "messages" | "guide";

/** Which assistant: Ask School AI, or the admin analytics assistant (school-wide figures, admins only). */
export type AssistantMode = "chat" | "analytics";

/** Something the assistant prepared (e.g. a leave application). Nothing happens until the user confirms it. */
export interface ProposedAction {
  id: string;
  kind: string;
  summary: string;
  status: "Pending" | "Completed" | "Cancelled" | "Failed" | "Expired";
  studentId: string | null;
  expiresAt: string;
  resultRef?: string | null;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Which school data the answer was based on; shown as chips so users can see where it came from. */
  sources?: AssistantSource[];
  /** True for replies produced by the offline demo adapter rather than AiService. */
  demo?: boolean;
  error?: boolean;
  /** Still being written (streaming). */
  pending?: boolean;
  /** The user stopped it before the end. */
  stopped?: boolean;
  errorText?: string;
  /** The question to resend from the Retry button. */
  retry?: string;
  /** Actions prepared in this answer, each awaiting confirmation. */
  actions?: ProposedAction[];
  /** An answer taken from the School Sphere guide (steps, menu path, screen to open) instead of the AI service. */
  help?: HelpReply;
  /** Screens the service offered to open. Shown as a button only after the app checks them against its own routes and the reader's access. */
  navigation?: NavigationAction[];
}

export interface AssistantChatRequest {
  conversationId?: string;
  message: string;
  /** Parents ask about one child at a time; the backend still re-checks the guardian link. */
  studentId?: string;
  /** The screen the question was asked from (e.g. "Fees"), as context only. */
  page?: string;
}

export interface AssistantChatResponse {
  conversationId: string;
  reply: string;
  sources: AssistantSource[];
  demo?: boolean;
  actions?: ProposedAction[];
  navigation?: NavigationAction[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  feature: string;
  /** The child a parent's conversation was about. */
  studentId: string | null;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string; sources: string[]; createdAt: string }[];
}
