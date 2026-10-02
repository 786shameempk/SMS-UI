export type AssistantSource = "timetable" | "attendance" | "fees" | "exams" | "notices" | "homework" | "materials";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Which school data the answer was based on; shown as chips so users can see where it came from. */
  sources?: AssistantSource[];
  /** True for replies produced by the offline demo adapter rather than AiService. */
  demo?: boolean;
  error?: boolean;
}

export interface AssistantChatRequest {
  conversationId?: string;
  message: string;
  /** Parents ask about one child at a time; the backend still re-checks the guardian link. */
  studentId?: string;
}

export interface AssistantChatResponse {
  conversationId: string;
  reply: string;
  sources: AssistantSource[];
  demo?: boolean;
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
