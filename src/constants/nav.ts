import type { LucideIcon } from "lucide-react";
import { Briefcase, GraduationCap, LayoutDashboard, ShieldCheck, UsersRound, Users } from "lucide-react";
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
];

/** Grouped nav sections (Academics, Administration, ...). Populated module-by-module. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Academics",
    permissionKey: "students",
    items: [{ label: "Students", to: "/students", icon: GraduationCap }],
  },
  {
    title: "Human Resources",
    permissionKey: "staff",
    items: [{ label: "Staff Management", to: "/staff", icon: Briefcase }],
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
