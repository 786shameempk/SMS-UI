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
  Building2,
  Handshake,
  Headset,
  Rocket,
  SlidersHorizontal,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { AVAILABLE_MODULE_LABELS } from "@/features/platform/constants";

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
    description: "A student management system for profiles, admissions, enrollment, documents, and academic records — every student's story in one place.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance Management",
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
    title: "Fee Management",
    description: "Fee structures, invoices, online payments, receipts, and accounts that reconcile themselves.",
  },
  {
    icon: ChartColumn,
    title: "Reports & Analytics",
    description: "Live dashboards and ready-made reports that turn everyday school data into clear, useful answers.",
  },
  {
    icon: Workflow,
    title: "AI & Automation",
    description: "AI-drafted reminders and notes, automatic follow-ups, and routine paperwork that runs on its own, so staff spend time on students instead.",
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

// ── Plans & Solutions ───────────────────────────────────────────────
// Commercial pricing is private by design: plans describe what's included, and prices are only ever
// shared through a quote. Never add amounts, currencies or per-month figures here.

export type PlanKey = "Starter" | "Professional" | "Enterprise";

export interface PlanSolution {
  key: PlanKey;
  subtitle: string;
  /** Replaces a price: the plan's commercial terms are discussed, not published. */
  pricingNote: string;
  icon: LucideIcon;
  features: string[];
  highlighted?: boolean;
  cta: "Explore Plan" | "Contact Us";
}

export const PLAN_SOLUTIONS: PlanSolution[] = [
  {
    key: "Starter",
    subtitle: "Essential tools for getting started",
    pricingNote: "Flexible pricing",
    icon: Sprout,
    features: ["Student Management", "Staff Management", "Attendance", "Basic Fees Management", "Basic Reports", "Core School Administration"],
    cta: "Explore Plan",
  },
  {
    key: "Professional",
    subtitle: "Advanced tools for growing schools",
    pricingNote: "Contact us for pricing",
    icon: Rocket,
    highlighted: true,
    features: [
      "Everything in Starter",
      "Online Exams",
      "Advanced Reports",
      "Parent Portal",
      "Notifications",
      "AI-powered features",
      "Advanced School Management",
    ],
    cta: "Explore Plan",
  },
  {
    key: "Enterprise",
    subtitle: "Flexible solutions for larger institutions",
    pricingNote: "Custom plan",
    icon: Building2,
    features: [
      "Everything in Professional",
      "Custom Modules",
      "Advanced Integrations",
      "Custom Workflows",
      "Dedicated Support",
      "Flexible Deployment Options",
      "Custom Requirements",
    ],
    cta: "Contact Us",
  },
];

export const PLAN_KEYS: PlanKey[] = PLAN_SOLUTIONS.map((p) => p.key);

/** Reassurances shown under the plan cards, in place of a price table. */
export const PLAN_ASSURANCES = [
  { icon: SlidersHorizontal, title: "Tailored to your requirements", description: "Pick the modules you need today and add more as your school grows." },
  { icon: Handshake, title: "Transparent, personal quotes", description: "Pricing is shared directly with your school, based on size and scope." },
  { icon: Headset, title: "Guided onboarding", description: "Our team helps with setup, data migration and staff training." },
] as const;

/** Modules a school can ask about in the quote form (the same names as the plan catalog). */
export const QUOTE_MODULE_OPTIONS: string[] = AVAILABLE_MODULE_LABELS.filter(
  (m) => !["Dashboard", "User Management", "Roles & Permissions", "Settings"].includes(m),
);

export const STAFF_COUNT_OPTIONS = ["Under 25", "25 – 50", "50 – 100", "100 – 250", "250+"] as const;

// ── FAQ ─────────────────────────────────────────────────────────────
// Plain-text answers: the same strings feed the visible FAQ and its FAQPage JSON-LD, so they never drift apart.

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQS: FaqItem[] = [
  {
    question: "What is an AI School Management System?",
    answer:
      "An AI school management system is a single platform that runs a school's administration, academics, attendance, fees, and communication, and uses AI to spot patterns in that data and take routine work off staff. School Sphere combines a complete school ERP with AI insights and drafting tools.",
  },
  {
    question: "How does an AI School Management System help schools?",
    answer:
      "It replaces spreadsheets and disconnected tools with one source of truth. Administrators see the whole school in one dashboard, teachers spend less time on paperwork, parents get timely updates, and the AI flags issues such as falling attendance or overdue fees before they become problems.",
  },
  {
    question: "What features are included in School Sphere?",
    answer:
      "School Sphere covers student management, attendance, academics, timetables, examinations and online exams, homework, fee management and accounting, parent communication, online classes, study materials, transport, library, reports, and more — all under one login with role-based access.",
  },
  {
    question: "Does School Sphere provide student management?",
    answer:
      "Yes. The student management system holds every student's profile, admission and enrollment details, documents, guardians, attendance, marks, and fee history, so staff can find complete records in seconds.",
  },
  {
    question: "Can School Sphere manage school attendance?",
    answer:
      "Yes. Teachers mark class attendance in a couple of taps on any device, parents can follow it in the parent portal, and daily, monthly, and yearly attendance reports are available for both students and staff.",
  },
  {
    question: "Does School Sphere support fee management?",
    answer:
      "Yes. You can set up fee structures, generate invoices, accept online payments, issue receipts, and track overdue fees. Parents can view and pay fees from the parent portal.",
  },
  {
    question: "How does School Sphere use AI in school management?",
    answer:
      "School Sphere's AI highlights students who may need attention based on attendance, academic performance, and overdue fees, surfaces trends across attendance, academics, fees, and admissions, and drafts report card comments, fee reminders, and parent notes from each student's real records for staff to review.",
  },
];

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
