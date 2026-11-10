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
  "staff attendance": "Staff attendance",
  "staff leave": "Staff leave",
  appraisal: "Performance & Appraisal",
  hostel: "Hostel",
  campus: "Campus",
  "extra-curricular": "Co-Curricular",
  store: "Store Management",
  "lesson-portions": "Syllabus & Portions",
  profile: "Profile",
  sustainability: "Sustainability",
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
  "Which invoices are overdue?",
  "Who is absent today?",
  "Who was present on the last working day?",
  "Which teachers are on leave today?",
  "Which classes have attendance below 80% this week?",
  "How far along is the staff appraisal?",
];

export function suggestedPrompts(role: UserRole | undefined, mode: "chat" | "analytics" = "chat"): string[] {
  if (mode === "analytics") return ANALYTICS_PROMPTS;
  return role === "student" || role === "parent" ? LEARNER_PROMPTS : STAFF_PROMPTS;
}

/** React Query key for the signed-in user's conversation list. */
export const CONVERSATIONS_KEY = ["ai", "conversations"] as const;
