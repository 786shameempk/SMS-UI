import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import type { Channel, ContactGroup, MessageTemplate } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const SEED_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl-1",
    name: "Fee due reminder",
    category: "Fee Reminder",
    subject: "Fee payment reminder",
    body: "Dear parent, this is a reminder that the term fee for your ward is due shortly. Please make the payment at the earliest to avoid a late fine. Thank you.",
    channels: ["email", "sms"],
  },
  {
    id: "tpl-2",
    name: "PTA meeting invite",
    category: "Event",
    subject: "Parent-Teacher meeting invitation",
    body: "You are invited to the upcoming Parent-Teacher meeting. Please make it convenient to attend and discuss your ward's academic progress.",
    channels: ["email", "sms", "in-app"],
  },
  {
    id: "tpl-3",
    name: "Exam schedule notice",
    category: "Exam Notice",
    subject: "Upcoming examination schedule",
    body: "The examination schedule has been published. Please check the Examinations section for detailed dates and syllabus coverage.",
    channels: ["email", "in-app"],
  },
  {
    id: "tpl-4",
    name: "Holiday announcement",
    category: "Announcement",
    subject: "School holiday announcement",
    body: "Please note that the school will remain closed on the upcoming date. Regular classes will resume the following working day.",
    channels: ["email", "sms", "whatsapp", "in-app"],
  },
  {
    id: "tpl-5",
    name: "Emergency closure",
    category: "Emergency",
    subject: "Urgent: School closure notice",
    body: "Due to unforeseen circumstances, the school will remain closed today. Please keep your ward at home and watch for further updates.",
    channels: ["email", "sms", "push", "whatsapp"],
  },
];

/**
 * Deterministic demo groups layered over the real students/staff directories, same
 * convention as library's buildSeedLibraryData: a couple of grade-level parent/student
 * groups plus an all-teaching-staff group.
 */
export function buildSeedGroups(students: Student[], staff: StaffMember[]): ContactGroup[] {
  const grade10Students = students.filter((s) => s.className === "Grade 10").map((s) => s.id);
  const grade12Students = students.filter((s) => s.className === "Grade 12").map((s) => s.id);
  const teachingStaff = staff.filter((s) => s.designation === "Teacher").map((s) => s.id);

  const groups: ContactGroup[] = [
    {
      id: "grp-1",
      name: "Grade 10 Parents",
      description: "Parents/guardians of all Grade 10 students.",
      audienceType: "parents",
      memberIds: grade10Students,
    },
    {
      id: "grp-2",
      name: "Grade 12 Students",
      description: "All students currently enrolled in Grade 12.",
      audienceType: "students",
      memberIds: grade12Students,
    },
    {
      id: "grp-3",
      name: "Teaching Staff",
      description: "All staff with the Teacher designation.",
      audienceType: "staff",
      memberIds: teachingStaff,
    },
  ];

  return groups.filter((g) => g.memberIds.length > 0);
}

export interface SeedMessagePlan {
  subject?: string;
  body: string;
  channels: Channel[];
  groupIds: string[];
  studentIds: string[];
  staffIds: string[];
  daysAgoSent?: number;
  daysFromNowScheduled?: number;
}

export function buildSeedMessagePlans(groups: ContactGroup[]): SeedMessagePlan[] {
  const grade10 = groups.find((g) => g.id === "grp-1");
  const teaching = groups.find((g) => g.id === "grp-3");

  const plans: SeedMessagePlan[] = [
    {
      subject: "Fee payment reminder",
      body: "Dear parent, this is a reminder that the term fee for your ward is due shortly. Please make the payment at the earliest to avoid a late fine. Thank you.",
      channels: ["email", "sms"],
      groupIds: grade10 ? [grade10.id] : [],
      studentIds: [],
      staffIds: [],
      daysAgoSent: 6,
    },
    {
      subject: "Staff meeting reminder",
      body: "A reminder that the monthly staff meeting is scheduled this Friday at 4 PM in the staff room.",
      channels: ["email", "in-app"],
      groupIds: teaching ? [teaching.id] : [],
      studentIds: [],
      staffIds: [],
      daysAgoSent: 2,
    },
    {
      subject: "Upcoming PTA meeting",
      body: "You are invited to the upcoming Parent-Teacher meeting. Please make it convenient to attend.",
      channels: ["email", "sms", "in-app"],
      groupIds: grade10 ? [grade10.id] : [],
      studentIds: [],
      staffIds: [],
      daysFromNowScheduled: 3,
    },
  ];

  return plans.filter((p) => p.groupIds.length > 0 || p.studentIds.length > 0 || p.staffIds.length > 0);
}

export { genId, daysAgo, daysFromNow };
