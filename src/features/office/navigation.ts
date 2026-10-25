import {
  BadgeCheck,
  BarChart3,
  Bell,
  Blocks,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GitPullRequestArrow,
  UploadCloud,
  KeyRound,
  LayoutDashboard,
  Receipt,
  School,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface OfficeNavItem {
  /** Path under /office. */
  to: string;
  label: string;
  icon: LucideIcon;
  /** The office permission that opens it. */
  permission: string;
  /** Also shown for these permissions (any one is enough). */
  anyOf?: string[];
}

/**
 * The office menu, in display order. An entry shows only to a user holding its permission; the API enforces the same
 * permission on every call, so hiding an entry is a convenience and never the security boundary.
 */
export const OFFICE_NAV: readonly OfficeNavItem[] = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { to: "schools", label: "Schools", icon: School, permission: "schools.view" },
  { to: "onboarding", label: "Onboarding", icon: GitPullRequestArrow, permission: "onboarding.view" },
  { to: "bulk-import", label: "Bulk Import", icon: UploadCloud, permission: "onboarding.import.view" },
  { to: "profile-approvals", label: "Profile Approvals", icon: ClipboardCheck, permission: "onboarding.profiles.view" },
  { to: "plans", label: "Subscription Plans", icon: Boxes, permission: "plans.view" },
  { to: "plan-builder", label: "Custom Plan Builder", icon: Sparkles, permission: "customplans.manage" },
  { to: "quotations", label: "Quotations", icon: FileText, permission: "quotations.view" },
  { to: "purchases", label: "Purchases", icon: ClipboardList, permission: "purchases.view" },
  { to: "subscriptions", label: "Subscriptions", icon: BadgeCheck, permission: "subscriptions.view" },
  { to: "entitlements", label: "Modules & Entitlements", icon: Blocks, permission: "entitlements.view" },
  { to: "billing", label: "Billing & Payments", icon: Wallet, permission: "billing.view" },
  { to: "invoices", label: "Invoices", icon: Receipt, permission: "billing.view" },
  { to: "monitoring", label: "Monitoring & Alerts", icon: Bell, permission: "monitoring.view" },
  { to: "users", label: "Office Users", icon: Users, permission: "users.view" },
  { to: "roles", label: "Roles & Permissions", icon: KeyRound, permission: "users.view" },
  { to: "reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
  { to: "audit", label: "Audit Logs", icon: ScrollText, permission: "audit.view" },
  { to: "settings", label: "Office Settings", icon: Settings, permission: "settings.view" },
  { to: "security", label: "My Security", icon: ShieldCheck, permission: "*" },
];

/** The entries this user may see. "*" means every signed-in office user. */
export function visibleNav(permissions: readonly string[], implemented: ReadonlySet<string>): OfficeNavItem[] {
  return OFFICE_NAV.filter((n) => implemented.has(n.to) && (n.permission === "*" || permissions.includes(n.permission) || n.anyOf?.some((p) => permissions.includes(p))));
}
