import {
  BellRing,
  CalendarCheck,
  ChartColumn,
  Cloud,
  FileBarChart,
  FileLock2,
  Fingerprint,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LibraryBig,
  Megaphone,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  TrendingDown,
  UserCheck,
  UserRoundSearch,
  UsersRound,
  Video,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { listPlans } from "@/features/platform/api";
import { AVAILABLE_MODULE_LABELS } from "@/features/platform/constants";
import { formatCurrency } from "@/utils/format";

/** School-facing modules in the plan catalog, so the headline count never drifts from `/platform`. */
export const MODULE_COUNT = AVAILABLE_MODULE_LABELS.length;

interface IconItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

// ── Value strip ──────────────────────────────────────────────────────

export const VALUE_PILLARS = ["One Platform", "Less Administration", "Better Communication", "Smarter Decisions"] as const;

export const TRUST_BADGES: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShieldCheck, label: "Secure" },
  { icon: Cloud, label: "Cloud-based" },
  { icon: Smartphone, label: "Mobile-friendly" },
  { icon: KeyRound, label: "Role-based access" },
];

// ── Everything in one place ─────────────────────────────────────────

export const FEATURES: IconItem[] = [
  {
    icon: GraduationCap,
    title: "Student Management",
    description: "Profiles, admissions, enrollment, documents, and academic records — every student's story in one place.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance",
    description: "Mark a class in seconds and spot patterns early, with daily, monthly, and yearly views for students and staff.",
  },
  {
    icon: LibraryBig,
    title: "Academic Management",
    description: "Classes, subjects, timetables, assignments, examinations, and report cards that stay in sync automatically.",
  },
  {
    icon: UserCheck,
    title: "Teacher Management",
    description: "Timetables, homework, marks entry, and study materials — the daily tools teachers need, on any device.",
  },
  {
    icon: Megaphone,
    title: "Parent Communication",
    description: "Announcements, notifications, and updates that reach parents by app, email, or SMS — and actually get read.",
  },
  {
    icon: Wallet,
    title: "Fees & Finance",
    description: "Fee structures, invoices, online payments, receipts, and accounts that reconcile themselves.",
  },
  {
    icon: ChartColumn,
    title: "Reports & Analytics",
    description: "Live dashboards and ready-made reports that turn everyday school data into clear, useful answers.",
  },
  {
    icon: Workflow,
    title: "Smart Automation",
    description: "Reminders, follow-ups, and routine paperwork run on their own, so staff spend time on students instead.",
  },
];

/** Recently shipped modules, called out under the feature grid. */
export const NEW_MODULES: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Video, label: "Online Classes" },
  { icon: LibraryBig, label: "Study Materials" },
  { icon: Star, label: "Talent Showcase" },
  { icon: UsersRound, label: "Parent Portal" },
];

// ── Designed for every role ─────────────────────────────────────────

export type RoleId = "admin" | "teacher" | "student" | "parent";

export interface RoleCard {
  id: RoleId;
  role: string;
  headline: string;
  points: string[];
}

export const ROLE_CARDS: RoleCard[] = [
  {
    id: "admin",
    role: "Administrators",
    headline: "Run every branch and department from one live view.",
    points: ["Enrollment, fees, and staffing at a glance", "Custom roles and permissions", "Branch-by-branch or combined reports"],
  },
  {
    id: "teacher",
    role: "Teachers",
    headline: "Less paperwork, more time in the classroom.",
    points: ["Attendance in a couple of taps", "Homework, marks, and materials", "Live online classes built in"],
  },
  {
    id: "student",
    role: "Students",
    headline: "Everything for the school day, always up to date.",
    points: ["Timetable and homework due dates", "Notes, papers, and recordings", "A showcase for their talents"],
  },
  {
    id: "parent",
    role: "Parents",
    headline: "Stay close to your child's school day.",
    points: ["Attendance, homework, and results", "Pay fees online in a few taps", "Bus tracking and school updates"],
  },
];

// ── Smarter insights ────────────────────────────────────────────────

export const INSIGHT_CAPABILITIES: Array<{ icon: LucideIcon; label: string }> = [
  { icon: TrendingDown, label: "Identify attendance trends" },
  { icon: UserRoundSearch, label: "Highlight students who may need attention" },
  { icon: FileBarChart, label: "Generate useful reports" },
  { icon: Workflow, label: "Automate repetitive workflows" },
  { icon: BellRing, label: "Surface important information" },
  { icon: Sparkles, label: "Simplify administrative tasks" },
];

// ── How it works ────────────────────────────────────────────────────

export const STEPS: Array<IconItem & { number: string }> = [
  {
    number: "01",
    icon: LayoutDashboard,
    title: "Set Up Your School",
    description: "Configure your school, branches, academic structure, users, and roles — we help you import what you already have.",
  },
  {
    number: "02",
    icon: UsersRound,
    title: "Connect Your Community",
    description: "Invite administrators, teachers, students, and parents. Each sees exactly what their role needs.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Manage Everything",
    description: "Run admissions, classes, fees, and communication day to day from one centralized system.",
  },
];

// ── Security ────────────────────────────────────────────────────────

export const SECURITY_ITEMS: IconItem[] = [
  { icon: KeyRound, title: "Role-based access control", description: "Every role sees only the modules and actions it's been granted." },
  { icon: Fingerprint, title: "Secure authentication", description: "Strong passwords, multi-factor sign-in, and session controls." },
  { icon: FileLock2, title: "Data protection", description: "Each school's data is isolated from every other school's." },
  { icon: ScrollText, title: "Audit-friendly workflows", description: "Sensitive changes are logged with who, what, and when." },
  { icon: Cloud, title: "Secure cloud infrastructure", description: "Hosted on managed cloud infrastructure with regular backups." },
  { icon: ShieldCheck, title: "Permission-based access", description: "Fine-grained permissions down to individual screens and actions." },
];

// ── Testimonials ────────────────────────────────────────────────────

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  school: string;
}

// Placeholder testimonials - replace with real quotes (and permission to use them) before launch.
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We reduced the amount of manual administrative work significantly and gave teachers more time to focus on students.",
    name: "Ava Whitfield",
    role: "School Administrator",
    school: "Greenfield Public School",
  },
  {
    quote:
      "Parents finally see attendance, homework, and fee updates in one place. The number of calls to our front office has dropped noticeably.",
    name: "Meera Iyer",
    role: "Principal",
    school: "Riverside International School",
  },
  {
    quote:
      "Taking attendance and sharing class notes now takes minutes instead of a free period. It just fits into how I already teach.",
    name: "Rahul Menon",
    role: "Mathematics Teacher",
    school: "Lakeside Academy",
  },
];

// ── Pricing ─────────────────────────────────────────────────────────

export interface PricingTier {
  id: string;
  name: string;
  priceLabel: string;
  description: string;
  highlighted: boolean;
  features: string[];
}

/** Read from the Platform Console's real plan catalog (public endpoint) so pricing never drifts from `/platform`. */
export async function getPricingTiers(): Promise<PricingTier[]> {
  const plans = await listPlans();
  const descriptions: Record<string, string> = {
    starter: "For a single campus just getting off spreadsheets.",
    growth: "For growing schools that need every module working together.",
    enterprise: "For multi-branch networks that need scale and control.",
  };
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    priceLabel: `${formatCurrency(plan.monthlyPriceInr)}/mo`,
    description: descriptions[plan.tier] ?? "",
    highlighted: plan.tier === "growth",
    features: [
      `Up to ${plan.maxStudents.toLocaleString("en-IN")} students`,
      `Up to ${plan.maxStaff.toLocaleString("en-IN")} staff accounts`,
      `${plan.storageGb} GB document storage`,
      `${plan.includedModules.length} of ${AVAILABLE_MODULE_LABELS.length} modules included`,
    ],
  }));
}

// ── Lead capture (Contact Us widget / Request a Demo) ─────────────────────

export const COUNTRY_CODES = [
  { code: "IN", flag: "🇮🇳", dial: "+91" },
  { code: "AE", flag: "🇦🇪", dial: "+971" },
  { code: "SA", flag: "🇸🇦", dial: "+966" },
  { code: "QA", flag: "🇶🇦", dial: "+974" },
  { code: "OM", flag: "🇴🇲", dial: "+968" },
  { code: "KW", flag: "🇰🇼", dial: "+965" },
  { code: "BH", flag: "🇧🇭", dial: "+973" },
  { code: "SG", flag: "🇸🇬", dial: "+65" },
  { code: "GB", flag: "🇬🇧", dial: "+44" },
  { code: "US", flag: "🇺🇸", dial: "+1" },
] as const;

export const STUDENT_COUNT_OPTIONS = ["Under 250", "250 – 500", "500 – 1,000", "1,000 – 2,500", "2,500+"] as const;

export const DEMO_HIGHLIGHTS = [
  "A 30-minute live walkthrough tailored to your school",
  "See admissions, fees, attendance, exams and online classes working together",
  "Get migration and pricing answers from a product specialist",
] as const;
