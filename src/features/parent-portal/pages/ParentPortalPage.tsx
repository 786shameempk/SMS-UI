import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpenCheck,
  CalendarCheck,
  CalendarOff,
  FileCheck2,
  LayoutGrid,
  Loader2,
  MessageSquareText,
  Star,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { getMyChildren } from "../api";
import ChildSwitcher from "../components/ChildSwitcher";
import OverviewTab from "../components/OverviewTab";
import AttendanceTab from "../components/AttendanceTab";
import HomeworkTab from "../components/HomeworkTab";
import ExamResultsTab from "../components/ExamResultsTab";
import FeesTab from "../components/FeesTab";
import MessagesTab from "../components/MessagesTab";
import LeaveRequestsTab from "../components/LeaveRequestsTab";
import NotificationsTab from "../components/NotificationsTab";

const CHILD_SCOPED_TABS = new Set(["attendance", "homework", "exams", "fees", "messages", "leave"]);

const TABS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "overview", label: "Overview", icon: LayoutGrid },
  { value: "attendance", label: "Attendance", icon: CalendarCheck },
  { value: "homework", label: "Homework", icon: BookOpenCheck },
  { value: "exams", label: "Exam Results", icon: FileCheck2 },
  { value: "fees", label: "Fees", icon: Wallet },
  { value: "messages", label: "Messages", icon: MessageSquareText },
  { value: "leave", label: "Leave", icon: CalendarOff },
  { value: "notifications", label: "Notifications", icon: Bell },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

interface QuickAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  tint: string;
  to?: string;
  tab?: string;
}

function QuickActionTile({ action, onTab }: { action: QuickAction; onTab: (tab: string) => void }) {
  const body = (
    <>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", action.tint)}>
        <action.icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-sm font-semibold text-foreground truncate lg:whitespace-normal">{action.label}</span>
        <span className="block text-xs text-muted-foreground truncate lg:whitespace-normal">{action.hint}</span>
      </span>
    </>
  );
  const className =
    "group flex items-center gap-3 lg:flex-col lg:items-start rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-300 cursor-pointer";

  return action.to ? (
    <Link to={action.to} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={() => onTab(action.tab!)} className={className}>
      {body}
    </button>
  );
}

export default function ParentPortalPage() {
  const user = useAuthStore((s) => s.user);
  const modulePermissions = useAuthStore((s) => s.modulePermissions);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["parent-portal", "children", user?.email],
    queryFn: () => getMyChildren(user!.email),
    enabled: Boolean(user?.email),
  });

  useEffect(() => {
    if (!selectedChildId && children.length > 0) setSelectedChildId(children[0].id);
  }, [children, selectedChildId]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading parent portal…
      </div>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;
  const teacherName = "Daniel Reyes";
  const firstName = user?.name?.split(" ")[0];
  const can = (key: string) => !modulePermissions || modulePermissions[key];

  const quickActions: QuickAction[] = [
    ...(can("meetings")
      ? [{ label: "Online Classes", hint: "Join live classes & meetings", icon: Video, tint: "bg-sky-500/12 text-sky-600 dark:text-sky-300", to: "/online-classes" }]
      : []),
    ...(can("talents")
      ? [{ label: "Talent Showcase", hint: "Share & cheer on talents", icon: Star, tint: "bg-violet-500/12 text-violet-600 dark:text-violet-300", to: "/talents" }]
      : []),
    { label: "Pay fees", hint: "Invoices & online payment", icon: Wallet, tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300", tab: "fees" },
    { label: "Apply for leave", hint: "Request a day off", icon: CalendarOff, tint: "bg-rose-500/12 text-rose-600 dark:text-rose-300", tab: "leave" },
    { label: "Message teacher", hint: "Talk to the class teacher", icon: MessageSquareText, tint: "bg-brand-500/15 text-brand-700 dark:text-brand-300", tab: "messages" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 px-5 py-6 sm:px-8 sm:py-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">Parent portal</p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight">
              {greeting()}
              {firstName ? `, ${firstName}` : ""} 👋
            </h1>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Everything about your {children.length === 1 ? "child's" : "children's"} school day in one place — attendance, homework, results, fees and more.
            </p>
            <p className="mt-3 text-xs text-white/50">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {children.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    setSelectedChildId(child.id);
                    setActiveTab("attendance");
                  }}
                  className="flex items-center gap-2.5 rounded-2xl bg-white/10 py-2 pl-2 pr-4 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/15 cursor-pointer"
                >
                  <Avatar className="h-9 w-9 ring-2 ring-brand-400/70">
                    {child.photoUrl && <AvatarImage src={child.photoUrl} alt={child.firstName} />}
                    <AvatarFallback className="bg-brand-500 text-slate-900 text-xs font-bold">{initialsOf(child.firstName, child.lastName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-left">
                    <span className="block text-sm font-semibold leading-tight">{child.firstName}</span>
                    <span className="block text-[11px] text-white/60 leading-tight">
                      {child.className} - {child.section}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-5 gap-3">
        {quickActions.map((action) => (
          <QuickActionTile key={action.label} action={action} onTab={setActiveTab} />
        ))}
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="h-auto gap-1 rounded-xl p-1">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 rounded-lg px-3 py-1.5">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {CHILD_SCOPED_TABS.has(activeTab) && children.length > 1 && (
          <div className="mt-4">
            <ChildSwitcher students={children} selectedId={selectedChildId} onSelect={setSelectedChildId} />
          </div>
        )}

        <TabsContent value="overview">
          <OverviewTab
            students={children}
            onViewChild={(id) => {
              setSelectedChildId(id);
              setActiveTab("attendance");
            }}
          />
        </TabsContent>

        {selectedChild ? (
          <>
            <TabsContent value="attendance">
              <AttendanceTab studentId={selectedChild.id} />
            </TabsContent>
            <TabsContent value="homework">
              <HomeworkTab studentId={selectedChild.id} />
            </TabsContent>
            <TabsContent value="exams">
              <ExamResultsTab studentId={selectedChild.id} />
            </TabsContent>
            <TabsContent value="fees">
              <FeesTab studentId={selectedChild.id} />
            </TabsContent>
            <TabsContent value="messages">
              <MessagesTab studentId={selectedChild.id} teacherName={teacherName} />
            </TabsContent>
            <TabsContent value="leave">
              <LeaveRequestsTab studentId={selectedChild.id} />
            </TabsContent>
          </>
        ) : (
          CHILD_SCOPED_TABS.has(activeTab) && <p className="text-sm text-muted-foreground mt-4">No children linked to this account.</p>
        )}

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
