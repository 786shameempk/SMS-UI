import {
  BookOpen,
  Bus,
  CalendarCheck,
  ChartColumn,
  Globe,
  GraduationCap,
  HeartPulse,
  Landmark,
  LibraryBig,
  Megaphone,
  School,
  ShieldCheck,
  Sparkles,
  Star,
  Trees,
  UsersRound,
  Video,
  Wallet,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { listPlans } from "@/features/platform/api";
import { AVAILABLE_MODULE_LABELS } from "@/features/platform/constants";
import { formatCurrency } from "@/utils/format";

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Recently shipped — gets a "New" pill on the landing page. */
  isNew?: boolean;
}

/** School-facing modules in the plan catalog, so the headline count never drifts from `/platform`. */
export const MODULE_COUNT = AVAILABLE_MODULE_LABELS.length;

export const FEATURES: FeatureItem[] = [
  {
    icon: Video,
    title: "Online Classes",
    description: "Scheduled live classes with chat, class materials, automatic attendance, cloud recordings, and push reminders before every session.",
    isNew: true,
  },
  {
    icon: LibraryBig,
    title: "Study Materials & Homework",
    description: "Teachers share notes, files, and links by class and subject; students see their homework and resources in one place.",
    isNew: true,
  },
  {
    icon: Star,
    title: "Talent Showcase",
    description: "A moderated space where students share art, music, and video — with teacher review, reactions, and a school-wide showcase.",
    isNew: true,
  },
  {
    icon: UsersRound,
    title: "Parent & Student Portal",
    description: "Parents follow their child's attendance, homework, fees, and school bus — and pay fees online in a few taps.",
    isNew: true,
  },
  {
    icon: GraduationCap,
    title: "Academics & Timetable",
    description: "Classes, sections, subjects, exams, and a conflict-aware timetable builder — all kept in sync automatically.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance & Analytics",
    description: "Manual, QR, biometric, or face capture with instant daily, monthly, and yearly reporting per student and staff.",
  },
  {
    icon: Wallet,
    title: "Fees & Accounting",
    description: "Structures, discounts, invoicing, online payments, receipts, and a real double-entry ledger with trial balance and GST summaries.",
  },
  {
    icon: WalletCards,
    title: "HR & Payroll",
    description: "Staff records, leave, performance reviews, and bulk monthly payroll runs with itemized, print-ready payslips.",
  },
  {
    icon: Bus,
    title: "Campus Operations",
    description: "Library catalogs with fines, stock control, bus routes and seats, hostel rooms and mess plans — all in one dashboard.",
  },
  {
    icon: HeartPulse,
    title: "Front Office & Wellbeing",
    description: "Visitor passes, health records, a help desk for complaints, surveys, and one-click certificates — the whole front desk, digital.",
  },
  {
    icon: Megaphone,
    title: "Communication Hub",
    description: "Email, SMS, push, and WhatsApp broadcasts with templates, scheduling, and a real in-app notification center.",
  },
  {
    icon: Sparkles,
    title: "Reports & AI Insights",
    description: "Nine live analytics dashboards plus AI-assisted risk flags and drafting, grounded in your school's real data.",
  },
];

export interface StatItem {
  value: string;
  label: string;
}

export const HERO_STATS: StatItem[] = [
  { value: "2,384+", label: "Students managed" },
  { value: "162+", label: "Staff & faculty" },
  { value: String(MODULE_COUNT), label: "Modules, one login" },
  { value: "99.9%", label: "Uptime SLA" },
];

export interface WhyItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const WHY_ITEMS: WhyItem[] = [
  {
    icon: ShieldCheck,
    title: "Enterprise-grade security",
    description: "Custom roles with module-level permissions, MFA, full audit trails, and per-tenant data isolation by default — not bolted on later.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted, not AI-replaced",
    description: "Smart insights and drafting that stay grounded in your real records — never a fabricated number or invented result.",
  },
  {
    icon: Globe,
    title: "Built to scale",
    description: "From a single campus to a multi-branch network — give any role access to every branch, and pick only the modules your plan needs.",
  },
  {
    icon: ChartColumn,
    title: "Decisions backed by data",
    description: "Nine live analytics dashboards mean every decision starts from the same source of truth as the front office.",
  },
];

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We replaced six spreadsheets and two disconnected tools with School Sphere in a single term. Our front office finally runs on one source of truth.",
    name: "Ava Whitfield",
    role: "School Administrator, Greenfield Public School",
  },
  {
    quote:
      "Rolling out a second campus used to mean standing up a second system. Now it's a dropdown in the header, with real data isolation underneath.",
    name: "Nikhil Shetty",
    role: "Super Admin, Platform Console",
  },
  {
    quote:
      "Attendance, report cards, and fee reminders used to eat an entire afternoon every week. Now it's a glance at the dashboard between classes.",
    name: "Meera Iyer",
    role: "Principal, Riverside International School",
  },
];

export interface Partner {
  name: string;
  location: string;
  /** Path to a real logo under /public (e.g. "/partners/greenfield.svg"). Without one, a crest is drawn from `icon` + `color`. */
  logoUrl?: string;
  icon: LucideIcon;
  color: string;
}

// Placeholder partners - replace with real schools/companies (and their logos) once they've agreed to be listed.
export const PARTNERS: Partner[] = [
  { name: "Greenfield Public School", location: "Kochi", icon: GraduationCap, color: "#16a34a" },
  { name: "St. Aurora Convent", location: "Bengaluru", icon: BookOpen, color: "#2563eb" },
  { name: "Horizon International", location: "Dubai", icon: Globe, color: "#0891b2" },
  { name: "Lakeside Academy", location: "Kozhikode", icon: School, color: "#7c3aed" },
  { name: "Brightpath EduTrust", location: "Chennai", icon: Landmark, color: "#dc2626" },
  { name: "Cedar Valley School", location: "Mysuru", icon: Trees, color: "#ea580c" },
];

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
