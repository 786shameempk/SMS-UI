import { useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  ArrowRight,
  BookOpenText,
  ChartNoAxesCombined,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  LibraryBig,
  Lightbulb,
  LayoutGrid,
  PenLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/authStore";
import InsightsTab from "../components/InsightsTab";
import AtRiskStudentsTab from "../components/AtRiskStudentsTab";
import AssistantTab from "../components/AssistantTab";
import ContentAssistantTab from "../components/ContentAssistantTab";
import GeneratorsTab from "../components/GeneratorsTab";
import StudyAssistantTab from "../components/study/StudyAssistantTab";
import StudyMaterialsPanel from "../components/study/StudyMaterialsPanel";
import UsageTab from "../components/UsageTab";
import AssistantChat from "../components/AssistantChat";
import ContentReviewTab from "../components/content/ContentReviewTab";
import LearningProfilePanel from "../components/learning/LearningProfilePanel";
import { useAiCapabilities } from "../capabilities";
import { readLastFeature, recommend, rememberFeature } from "../recommend";
import NotAvailableNotice from "../components/NotAvailableNotice";

interface Section {
  value: string;
  label: string;
  /** One line shown under the name on wide screens and above the content. */
  description: string;
  icon: LucideIcon;
  group: string;
  panel: ReactNode;
}

/** A feature the user may use: the page lists these in groups, one navigation entry each. */
function useSections(): Section[] {
  // The backend decides what AI this user may use and what the configured provider supports.
  const { can, unsupported, allowed } = useAiCapabilities();
  // Students see their own profile here; parents have it in the Parent Portal, staff on each student profile.
  const myLearning = useAuthStore((s) => s.user?.role === "student") && allowed("learning-profile");
  const toolsAllowed = can("generate-questions") || unsupported("generate-questions");
  const analyticsAllowed = can("analytics") || unsupported("analytics");

  const all: (Section | false)[] = [
    {
      value: "ask",
      label: "Ask School AI",
      description: "Ask about attendance, homework, results and fees",
      icon: Sparkles,
      group: "Ask & learn",
      panel: unsupported("chat") ? <NotAvailableNotice what="Ask School AI" /> : <AssistantTab />,
    },
    can("study-assistant") && { value: "study", label: "Study Assistant", description: "Study from school materials, with page citations", icon: BookOpenText, group: "Ask & learn", panel: <StudyAssistantTab /> },
    myLearning && { value: "learning", label: "My Learning", description: "Your strengths and what to practise next", icon: GraduationCap, group: "Ask & learn", panel: <LearningProfilePanel /> },
    toolsAllowed && {
      value: "tools",
      label: "Teacher Tools",
      description: "Generate questions and teaching material",
      icon: Wand2,
      group: "Teach & create",
      panel: unsupported("generate-questions") ? <NotAvailableNotice what="AI teacher tools" /> : <GeneratorsTab />,
    },
    can("upload-document") && { value: "materials", label: "Study Materials", description: "Upload documents the Study Assistant learns from", icon: LibraryBig, group: "Teach & create", panel: <StudyMaterialsPanel /> },
    { value: "assistant", label: "Content Assistant", description: "Draft report-card comments, reminders and notes", icon: PenLine, group: "Teach & create", panel: <ContentAssistantTab /> },
    can("author-content") && { value: "review", label: "Review & Publish", description: "Check AI-written content before it goes out", icon: ClipboardCheck, group: "Teach & create", panel: <ContentReviewTab /> },
    { value: "insights", label: "Insights", description: "Findings computed from this school's real data", icon: Lightbulb, group: "Insights", panel: <InsightsTab /> },
    { value: "at-risk", label: "At-Risk Students", description: "Low attendance, weak results or overdue fees", icon: ShieldAlert, group: "Insights", panel: <AtRiskStudentsTab /> },
    analyticsAllowed && {
      value: "analytics",
      label: "Analytics Assistant",
      description: "Ask questions about trends in your data",
      icon: ChartNoAxesCombined,
      group: "Insights",
      panel: unsupported("analytics") ? <NotAvailableNotice what="The analytics assistant" /> : <AssistantChat mode="analytics" page="AI Features" />,
    },
    can("view-usage") && { value: "usage", label: "AI Usage", description: "How much AI the school is using", icon: Gauge, group: "Manage", panel: <UsageTab /> },
  ];
  return all.filter((s): s is Section => Boolean(s));
}

const OVERVIEW = "overview";

const TRIGGER_CLASS = cn(
  "group flex shrink-0 snap-start cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-colors",
  "hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "data-[state=active]:border-primary/40 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground",
  "lg:w-full lg:items-start lg:gap-3 lg:whitespace-normal lg:rounded-xl lg:border-transparent lg:bg-transparent lg:p-2.5 lg:text-left lg:shadow-none",
  "lg:hover:bg-secondary lg:data-[state=active]:border-primary/25 lg:data-[state=active]:bg-accent",
);

/** One entry in the feature list: a chip on phones, an icon + name + description row on wide screens. */
function NavTrigger({ value, label, description, icon: Icon }: { value: string; label: string; description: string; icon: LucideIcon }) {
  return (
    <TabsPrimitive.Trigger value={value} aria-label={label} className={TRIGGER_CLASS}>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center lg:h-9 lg:w-9 lg:rounded-lg lg:bg-secondary lg:text-muted-foreground lg:ring-1 lg:ring-inset lg:ring-border/60",
          "group-data-[state=active]:text-primary-text lg:group-data-[state=active]:bg-primary lg:group-data-[state=active]:text-primary-foreground lg:group-data-[state=active]:ring-transparent",
        )}
      >
        <Icon className="h-4 w-4 lg:h-[18px] lg:w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm lg:font-semibold lg:text-foreground">{label}</span>
        <span className="mt-0.5 hidden text-xs font-normal leading-snug text-muted-foreground lg:block">{description}</span>
      </span>
    </TabsPrimitive.Trigger>
  );
}

/** The landing view: every feature this user may use, as cards grouped by what they are for. */
function FeatureCard({ section, reason, onOpen }: { section: Section; reason?: string; onOpen: (value: string) => void }) {
  const s = section;
  return (
    <button
      type="button"
      onClick={() => onOpen(s.value)}
      className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground ring-1 ring-inset ring-primary/20 transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-transparent"
      >
        <s.icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{s.label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{s.description}</span>
        {reason && <span className="mt-1.5 block text-[11px] font-medium text-primary-text">{reason}</span>}
      </span>
      <ArrowRight
        aria-hidden="true"
        className="mt-1 h-4 w-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-primary-text group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      />
    </button>
  );
}

function Overview({
  sections,
  groups,
  recommended,
  onOpen,
}: {
  sections: Section[];
  groups: string[];
  recommended: { section: Section; reason?: string }[];
  onOpen: (value: string) => void;
}) {
  return (
    <div className="space-y-7">
      {recommended.length > 0 && (
        <section aria-labelledby="ai-recommended" className="space-y-3 rounded-2xl border border-primary/20 bg-hero p-4 sm:p-5">
          <h3 id="ai-recommended" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-text">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Recommended for you
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.map(({ section, reason }) => (
              <FeatureCard key={section.value} section={section} reason={reason} onOpen={onOpen} />
            ))}
          </div>
        </section>
      )}
      {groups.map((group) => (
        <section key={group} aria-labelledby={`ai-group-${group}`} className="space-y-3">
          <h3 id={`ai-group-${group}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sections
              .filter((s) => s.group === group)
              .map((s) => (
                <FeatureCard key={s.value} section={s} onOpen={onOpen} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AIFeaturesPage() {
  const sections = useSections();
  const [params, setParams] = useSearchParams();
  // Vertical navigation beside the content on wide screens; a swipeable strip above it on phones.
  const wide = useMediaQuery("(min-width: 1024px)");

  // No (or an unusable) ?tab= opens the landing view of feature cards.
  const requested = params.get("tab");
  const section = sections.find((s) => s.value === requested);
  const activeValue = section?.value ?? OVERVIEW;
  const groups = useMemo(() => [...new Set(sections.map((s) => s.group))], [sections]);

  const role = useAuthStore((st) => st.user?.role);
  // Read once per visit to the landing view: opening a feature and coming back should show it as "used last".
  const recommended = useMemo(() => recommend(sections, role, activeValue === OVERVIEW ? readLastFeature() : null), [sections, role, activeValue]);

  const open = (value: string) => {
    if (value !== OVERVIEW) rememberFeature(value);
    setParams(value === OVERVIEW ? {} : { tab: value }, { replace: true });
  };

  return (
    <PageContainer>
      <PageHeader title="AI Features" description="Ask questions, study from school materials and get drafts and insights from this school's own data.">
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary-text" aria-hidden="true" />
            Answers come from your school's own records
          </li>
          <li className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-primary-text" aria-hidden="true" />
            You review every draft before it is used
          </li>
        </ul>
      </PageHeader>

      <Tabs
        value={activeValue}
        onValueChange={open}
        orientation={wide ? "vertical" : "horizontal"}
        className="grid min-w-0 gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8"
      >
        <TabsPrimitive.List
          aria-label="AI features"
          className={cn(
            // Phones: one swipeable row of chips that bleeds to the screen edge. Desktop: a sticky grouped list.
            "-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:scroll-px-6 sm:px-6",
            "lg:sticky lg:top-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0",
          )}
        >
          <div role="presentation" className="contents lg:block lg:pb-3">
            <NavTrigger value={OVERVIEW} label="Overview" description="Everything AI can do for you" icon={LayoutGrid} />
          </div>
          {groups.map((group) => (
            <div key={group} role="presentation" className="contents lg:block lg:space-y-1 lg:pb-3">
              <p className="hidden px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:block">{group}</p>
              {sections
                .filter((s) => s.group === group)
                .map((s) => (
                  <NavTrigger key={s.value} value={s.value} label={s.label} description={s.description} icon={s.icon} />
                ))}
            </div>
          ))}
        </TabsPrimitive.List>

        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground shadow-brand ring-1 ring-inset ring-white/25">
              {section ? <section.icon className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <h2 className="text-section-title">{section ? section.label : "What would you like to do?"}</h2>
              <p className="text-sm text-muted-foreground">{section ? section.description : "Pick a feature to get started. Everything here works from this school's own data."}</p>
            </div>
          </div>
          <TabsContent value={OVERVIEW} className="mt-0 min-w-0">
            <Overview sections={sections} groups={groups} recommended={recommended} onOpen={open} />
          </TabsContent>
          {sections.map((s) => (
            <TabsContent key={s.value} value={s.value} className="mt-0 min-w-0">
              {s.panel}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </PageContainer>
  );
}
