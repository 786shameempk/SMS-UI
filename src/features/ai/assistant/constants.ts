import type { AssistantSource } from "./types";
import type { UserRole } from "@/types/auth";

export const SOURCE_LABELS: Record<AssistantSource, string> = {
  timetable: "Timetable",
  attendance: "Attendance",
  fees: "Fees",
  exams: "Exams",
  notices: "Notices",
  homework: "Homework",
  materials: "Study materials",
  admissions: "Admissions",
  "at-risk students": "At-risk students",
  leave: "Leave",
  messages: "Messages",
  guide: "User guide",
};

const ANALYTICS_PROMPTS = [
  "How is fee collection this term?",
  "Which classes did worst in the latest exam?",
  "How many students are at risk, and why?",
  "How is attendance trending?",
];

const LEARNER_PROMPTS = [
  "What is tomorrow's timetable?",
  "How much school fee is pending?",
  "What is my attendance this month?",
  "When is the next exam?",
  "What homework is pending?",
  "What notices were published this week?",
];

const STAFF_PROMPTS = [
  "Which classes have attendance below 80% this week?",
  "How many students are absent today?",
  "Which fee invoices are overdue?",
  "What notices were published this week?",
];

export function suggestedPrompts(role: UserRole | undefined, mode: "chat" | "analytics" = "chat"): string[] {
  if (mode === "analytics") return ANALYTICS_PROMPTS;
  return role === "student" || role === "parent" ? LEARNER_PROMPTS : STAFF_PROMPTS;
}

/** React Query key for the signed-in user's conversation list. */
export const CONVERSATIONS_KEY = ["ai", "conversations"] as const;
