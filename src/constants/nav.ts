import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Briefcase,
  BookOpenCheck,
  BookOpenText,
  LibraryBig,
  Building2,
  Bus,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ClipboardList,
  FileCheck2,
  Globe,
  GraduationCap,
  HeartPulse,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  Library,
  Megaphone,
  PackageSearch,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  UsersRound,
  Users,
  Video,
  Vote,
  Wallet,
  WalletCards,
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
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Online Classes", to: "/online-classes", icon: Video, permissionKey: "meetings" },
  { label: "Talent Showcase", to: "/talents", icon: Star, permissionKey: "talents" },
  { label: "Parent Portal", to: "/parent-portal", icon: UsersRound, permissionKey: "parentPortal" },
  { label: "My Homework", to: "/my-homework", icon: BookOpenCheck, permissionKey: "homework" },
  // Top-level (not under Academics) because students and parents use it and can't see that section.
  { label: "Study Materials", to: "/study-materials", icon: LibraryBig, permissionKey: "studyMaterials" },
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
    items: [
      { label: "Staff Management", to: "/staff", icon: Briefcase },
      { label: "Payroll", to: "/payroll", icon: WalletCards, permissionKey: "payroll" },
    ],
  },
  {
    title: "Finance",
    permissionKey: "fees",
    items: [
      { label: "Fee Management", to: "/fees", icon: Wallet },
      { label: "Accounting", to: "/accounting", icon: BookOpenText, permissionKey: "accounting" },
    ],
  },
  {
    // Single-module areas grouped by what the school is doing, instead of one-item sections each.
    // Each item carries the permission its old one-item section had, so visibility is unchanged.
    title: "Campus Operations",
    items: [
      { label: "Library", to: "/library", icon: Library, permissionKey: "library" },
      { label: "Transport", to: "/transport", icon: Bus, permissionKey: "transport" },
      { label: "Hostel", to: "/hostel", icon: Building2, permissionKey: "hostel" },
      { label: "Inventory", to: "/inventory", icon: PackageSearch, permissionKey: "inventory" },
      { label: "Visitors", to: "/visitors", icon: IdCard, permissionKey: "visitors" },
      { label: "Health & Medical", to: "/health", icon: HeartPulse, permissionKey: "health" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { label: "Communication Center", to: "/communication", icon: Megaphone, permissionKey: "communication" },
      { label: "Surveys & Feedback", to: "/surveys", icon: Vote, permissionKey: "surveys" },
      { label: "Help Desk", to: "/helpdesk", icon: LifeBuoy, permissionKey: "helpdesk" },
      { label: "Certificates", to: "/certificates", icon: ScrollText, permissionKey: "certificates" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports & Analytics", to: "/reports", icon: ChartColumn, permissionKey: "reports" },
      { label: "AI Features", to: "/ai", icon: Sparkles, permissionKey: "aiFeatures" },
    ],
  },
  {
    title: "Administration",
    permissionKey: "administration",
    items: [
      { label: "User Management", to: "/admin/users", icon: Users },
      { label: "Roles & Permissions", to: "/admin/roles", icon: ShieldCheck },
      { label: "Branch Management", to: "/admin/branches", icon: Building2 },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
  {
    title: "Platform",
    permissionKey: "platformConsole",
    items: [{ label: "Platform Console", to: "/platform", icon: Globe }],
  },
];

/** Every navigable destination with its section, for breadcrumbs and the command menu. */
export const ALL_NAV_ENTRIES: Array<{ item: NavItem; section?: NavSection }> = [
  ...CORE_NAV_ITEMS.map((item) => ({ item })),
  ...NAV_SECTIONS.flatMap((section) => section.items.map((item) => ({ item, section }))),
];

/** Longest-prefix match of a pathname against the nav, e.g. "/students/42" → Academics › Students. */
export function findNavEntry(pathname: string) {
  let best: (typeof ALL_NAV_ENTRIES)[number] | undefined;
  for (const entry of ALL_NAV_ENTRIES) {
    const to = entry.item.to;
    const hit = pathname === to || pathname.startsWith(to + "/");
    if (hit && (!best || to.length > best.item.to.length)) best = entry;
  }
  return best;
}
