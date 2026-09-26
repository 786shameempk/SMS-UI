import type { LucideIcon } from "lucide-react";
import { BookOpen, Briefcase, ClipboardCheck, GraduationCap, Landmark, MonitorPlay, Presentation, Users, UsersRound } from "lucide-react";
import type { AttendanceStatus, AudienceType, MeetingStatus, MeetingType, Weekday } from "./types";

/**
 * Colour carries exactly two meanings in this module (design doc, "UI concept"): meeting *type* (the dot
 * and rail) and *status* (the pill). Everything else stays on the SMS neutrals and yellow brand.
 */
export interface MeetingTypeConfig {
  label: string;
  short: string;
  icon: LucideIcon;
  /** Solid colour for dots, rails and calendar events. */
  dot: string;
  /** Soft background + text for chips. */
  chip: string;
  /** Hex for FullCalendar, which needs a raw colour. */
  hex: string;
  noun: "class" | "meeting" | "exam" | "session";
}

export const MEETING_TYPES: Record<MeetingType, MeetingTypeConfig> = {
  OnlineClass: { label: "Online class", short: "Class", icon: MonitorPlay, dot: "bg-info", chip: "bg-info-soft text-info-strong", hex: "#3b82f6", noun: "class" },
  ParentTeacherMeeting: { label: "Parent–teacher meeting", short: "Parents", icon: UsersRound, dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", hex: "#8b5cf6", noun: "meeting" },
  TeacherMeeting: { label: "Teacher meeting", short: "Teachers", icon: Users, dot: "bg-teal-500", chip: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", hex: "#14b8a6", noun: "meeting" },
  StaffMeeting: { label: "Staff meeting", short: "Staff", icon: Briefcase, dot: "bg-teal-500", chip: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", hex: "#14b8a6", noun: "meeting" },
  PrincipalMeeting: { label: "Principal meeting", short: "Principal", icon: Landmark, dot: "bg-teal-600", chip: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", hex: "#0d9488", noun: "meeting" },
  ManagementMeeting: { label: "Management meeting", short: "Management", icon: Landmark, dot: "bg-teal-600", chip: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", hex: "#0d9488", noun: "meeting" },
  TrainingSession: { label: "Training session", short: "Training", icon: Presentation, dot: "bg-muted-foreground/60", chip: "bg-secondary text-slate-700 dark:text-slate-300", hex: "#94a3b8", noun: "session" },
  Examination: { label: "Exam / oral assessment", short: "Exam", icon: ClipboardCheck, dot: "bg-rose-500", chip: "bg-rose-50 text-destructive-strong dark:bg-rose-950/50", hex: "#f43f5e", noun: "exam" },
  Other: { label: "Other", short: "Other", icon: BookOpen, dot: "bg-muted-foreground/60", chip: "bg-secondary text-slate-700 dark:text-slate-300", hex: "#94a3b8", noun: "meeting" },
};

/** Legend groups for the calendar, matching the design doc's five colours. */
export const TYPE_LEGEND: Array<{ label: string; dot: string; types: MeetingType[] }> = [
  { label: "Online class", dot: "bg-info", types: ["OnlineClass"] },
  { label: "Parent meeting", dot: "bg-violet-500", types: ["ParentTeacherMeeting"] },
  { label: "Staff & management", dot: "bg-teal-500", types: ["TeacherMeeting", "StaffMeeting", "PrincipalMeeting", "ManagementMeeting"] },
  { label: "Exam", dot: "bg-rose-500", types: ["Examination"] },
  { label: "Other", dot: "bg-muted-foreground/60", types: ["TrainingSession", "Other"] },
];

export type DisplayStatus = "Live" | "Upcoming" | "Completed" | "Cancelled" | "Draft";

export const STATUS_STYLE: Record<DisplayStatus, { label: string; className: string; pulse?: boolean }> = {
  Live: { label: "Live", className: "bg-success-soft text-success-strong", pulse: true },
  Upcoming: { label: "Upcoming", className: "bg-info-soft text-info-strong" },
  Completed: { label: "Completed", className: "bg-secondary text-slate-600 dark:text-slate-300" },
  Cancelled: { label: "Cancelled", className: "bg-destructive-soft text-destructive-strong" },
  Draft: { label: "Draft", className: "bg-warning-soft text-warning-strong" },
};

export function displayStatus(status: MeetingStatus): DisplayStatus {
  return status === "Scheduled" ? "Upcoming" : status;
}

export const ATTENDANCE_STYLE: Record<AttendanceStatus, string> = {
  Present: "bg-success-soft text-success-strong",
  Late: "bg-warning-soft text-warning-strong",
  Partial: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  Absent: "bg-destructive-soft text-destructive-strong",
};

export const REMINDER_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1440, label: "1 day before" },
  { value: 60, label: "1 hour before" },
  { value: 30, label: "30 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 5, label: "5 minutes before" },
];

export const DURATION_OPTIONS = [15, 30, 40, 45, 60, 90, 120];

export const WEEKDAYS: Array<{ value: Weekday; short: string; letter: string }> = [
  { value: "Monday", short: "Mon", letter: "M" },
  { value: "Tuesday", short: "Tue", letter: "T" },
  { value: "Wednesday", short: "Wed", letter: "W" },
  { value: "Thursday", short: "Thu", letter: "T" },
  { value: "Friday", short: "Fri", letter: "F" },
  { value: "Saturday", short: "Sat", letter: "S" },
  { value: "Sunday", short: "Sun", letter: "S" },
];

export const AUDIENCE_LABEL: Record<AudienceType, string> = {
  Section: "Whole class",
  Class: "Whole grade",
  SectionGuardians: "Parents of the class",
  ClassGuardians: "Parents of the grade",
  Student: "Student",
  StudentGuardians: "Parents of a student",
  Staff: "Staff member",
  AllStaff: "All staff",
  AllTeachers: "All teachers",
  Management: "Management",
};

/** Who may schedule which meeting type in the form (the API enforces the same rule). */
export const TEACHER_MEETING_TYPES: MeetingType[] = ["OnlineClass", "ParentTeacherMeeting", "Examination", "TeacherMeeting", "TrainingSession", "Other"];

export const ALL_MEETING_TYPES = Object.keys(MEETING_TYPES) as MeetingType[];

export const STUDENT_ICON = GraduationCap;
