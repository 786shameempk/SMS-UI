import {
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  IdCard,
  LifeBuoy,
  Megaphone,
  Star,
  Video,
  Wallet,
  WalletCards,
} from "lucide-react";
import type { QuickAction } from "@/components/common/WelcomeHero";
import type { ModulePermissions, UserRole } from "@/types/auth";

type RoleAction = QuickAction & { permissionKey?: keyof ModulePermissions };

const TINT = {
  sky: "bg-sky-500/12 text-sky-600 dark:text-sky-300",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  emerald: "bg-emerald-500/12 text-success-strong",
  rose: "bg-rose-500/12 text-destructive-strong",
  brand: "bg-brand-500/15 text-primary-text dark:text-brand-300",
  indigo: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300",
};

const A = {
  students: { label: "Students", hint: "Profiles & admissions", icon: GraduationCap, tint: TINT.indigo, to: "/students", permissionKey: "students" },
  attendance: { label: "Attendance", hint: "Mark & review today", icon: CalendarCheck, tint: TINT.emerald, to: "/attendance", permissionKey: "attendance" },
  fees: { label: "Fees", hint: "Collections & dues", icon: Wallet, tint: TINT.brand, to: "/fees", permissionKey: "fees" },
  accounting: { label: "Accounting", hint: "Ledgers & journals", icon: BookOpen, tint: TINT.indigo, to: "/accounting", permissionKey: "accounting" },
  payroll: { label: "Payroll", hint: "Salaries & payslips", icon: WalletCards, tint: TINT.rose, to: "/payroll", permissionKey: "payroll" },
  meetings: { label: "Online Classes", hint: "Live classes & meetings", icon: Video, tint: TINT.sky, to: "/online-classes", permissionKey: "meetings" },
  talents: { label: "Talent Showcase", hint: "Share & cheer on talents", icon: Star, tint: TINT.violet, to: "/talents", permissionKey: "talents" },
  communication: { label: "Announcements", hint: "Message the school", icon: Megaphone, tint: TINT.rose, to: "/communication", permissionKey: "communication" },
  reports: { label: "Reports", hint: "Analytics & exports", icon: ChartColumn, tint: TINT.sky, to: "/reports", permissionKey: "reports" },
  homework: { label: "Homework", hint: "Assign & review work", icon: ClipboardList, tint: TINT.brand, to: "/homework", permissionKey: "homework" },
  myHomework: { label: "My Homework", hint: "What's due next", icon: BookOpenCheck, tint: TINT.brand, to: "/my-homework", permissionKey: "homework" },
  timetable: { label: "Timetable", hint: "Your week at a glance", icon: CalendarClock, tint: TINT.indigo, to: "/timetable", permissionKey: "timetable" },
  exams: { label: "Examinations", hint: "Schedules & marks", icon: FileCheck2, tint: TINT.rose, to: "/examinations", permissionKey: "examinations" },
  library: { label: "Library", hint: "Issue & return books", icon: BookOpen, tint: TINT.emerald, to: "/library", permissionKey: "library" },
  visitors: { label: "Visitors", hint: "Check visitors in & out", icon: IdCard, tint: TINT.emerald, to: "/visitors", permissionKey: "visitors" },
  helpdesk: { label: "Help Desk", hint: "Complaints & requests", icon: LifeBuoy, tint: TINT.rose, to: "/helpdesk", permissionKey: "helpdesk" },
  calendar: { label: "Calendar", hint: "Events & holidays", icon: CalendarDays, tint: TINT.sky, to: "/calendar" },
} satisfies Record<string, RoleAction>;

const BY_ROLE: Record<UserRole, RoleAction[]> = {
  superAdmin: [A.students, A.attendance, A.fees, A.meetings, A.communication, A.reports],
  admin: [A.students, A.attendance, A.fees, A.meetings, A.communication, A.reports],
  principal: [A.students, A.attendance, A.exams, A.meetings, A.talents, A.reports],
  teacher: [A.attendance, A.homework, A.timetable, A.exams, A.meetings, A.talents],
  accountant: [A.fees, A.accounting, A.payroll, A.reports, A.meetings, A.talents],
  librarian: [A.library, A.students, A.calendar, A.meetings, A.talents],
  receptionist: [A.visitors, A.helpdesk, A.students, A.calendar, A.meetings],
  student: [A.myHomework, A.timetable, A.meetings, A.talents, A.calendar],
  parent: [A.meetings, A.talents, A.calendar],
};

/** Shortcuts for the dashboard, limited to what the signed-in role can actually open. */
export function quickActionsFor(role: UserRole, permissions: ModulePermissions | null): QuickAction[] {
  return (BY_ROLE[role] ?? [])
    .filter((a) => !a.permissionKey || !permissions || permissions[a.permissionKey])
    .map(({ permissionKey: _permissionKey, ...action }) => action);
}

export const ROLE_TAGLINE: Record<UserRole, string> = {
  superAdmin: "Oversee every school on the platform from one place.",
  admin: "Here's how your school is doing today — admissions, attendance, fees and more.",
  principal: "A quick look at academics, staff and the pulse of your campus.",
  teacher: "Your classes, homework and exams for the day, all in one place.",
  accountant: "Collections, dues and payroll — everything finance needs today.",
  librarian: "Books due, new issues and what readers are up to.",
  receptionist: "Visitors, requests and today's front-desk happenings.",
  student: "Your classes, homework and the talents you're proud of.",
  parent: "Stay close to your child's school day.",
};
