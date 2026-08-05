import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Library,
  ShieldCheck,
  UserCheck,
  UsersRound,
  Users,
  Wallet,
} from "lucide-react";
import type { ModulePermissions } from "@/types/auth";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  permissionKey?: keyof ModulePermissions;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  permissionKey?: keyof ModulePermissions;
}

/** Core, ungrouped nav items shown above the sectioned nav. Extended as each module ships. */
export const CORE_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true },
  { label: "Parent Portal", to: "/parent-portal", icon: UsersRound, permissionKey: "parentPortal" },
  { label: "My Homework", to: "/my-homework", icon: BookOpenCheck, permissionKey: "homework" },
];

/** Grouped nav sections (Academics, Administration, ...). Populated module-by-module. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Academics",
    permissionKey: "students",
    items: [
      { label: "Students", to: "/students", icon: GraduationCap },
      { label: "Academic Setup", to: "/academics", icon: CalendarRange, permissionKey: "academics" },
      { label: "Attendance", to: "/attendance", icon: CalendarCheck, permissionKey: "attendance" },
      { label: "Teachers", to: "/teachers", icon: UserCheck, permissionKey: "teachers" },
      { label: "Timetable", to: "/timetable", icon: CalendarClock, permissionKey: "timetable" },
      { label: "Examinations", to: "/examinations", icon: FileCheck2, permissionKey: "examinations" },
      { label: "Homework", to: "/homework", icon: ClipboardList, permissionKey: "homework" },
    ],
  },
  {
    title: "Human Resources",
    permissionKey: "staff",
    items: [{ label: "Staff Management", to: "/staff", icon: Briefcase }],
  },
  {
    title: "Finance",
    permissionKey: "fees",
    items: [{ label: "Fee Management", to: "/fees", icon: Wallet }],
  },
  {
    title: "Library",
    permissionKey: "library",
    items: [{ label: "Library Management", to: "/library", icon: Library }],
  },
  {
    title: "Administration",
    permissionKey: "administration",
    items: [
      { label: "User Management", to: "/admin/users", icon: Users },
      { label: "Roles & Permissions", to: "/admin/roles", icon: ShieldCheck },
    ],
  },
];
