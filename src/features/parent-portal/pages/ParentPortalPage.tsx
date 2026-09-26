import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BookOpenCheck, CalendarCheck, CalendarOff, FileCheck2, LayoutGrid, MessageSquareText, Star, Video, Wallet, type LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { QuickActionGrid, timeOfDayGreeting, WelcomeHero, type QuickAction } from "@/components/common/WelcomeHero";
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
import { PageSkeleton } from "@/components/ui/states";
import { PageContainer } from "@/components/ui/page";

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

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
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
      <PageSkeleton />
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;
  const teacherName = "Daniel Reyes";
  const firstName = user?.name?.split(" ")[0];
  const can = (key: string) => !modulePermissions || modulePermissions[key];

  const quickActions: QuickAction[] = [
    ...(can("meetings")
      ? [{ label: "Online Classes", hint: "Join live classes & meetings", icon: Video, to: "/online-classes" }]
      : []),
    ...(can("talents")
      ? [{ label: "Talent Showcase", hint: "Share & cheer on talents", icon: Star, to: "/talents" }]
      : []),
    { label: "Pay fees", hint: "Invoices & online payment", icon: Wallet, onClick: () => setActiveTab("fees") },
    { label: "Apply for leave", hint: "Request a day off", icon: CalendarOff, onClick: () => setActiveTab("leave") },
    { label: "Message teacher", hint: "Talk to the class teacher", icon: MessageSquareText, onClick: () => setActiveTab("messages") },
  ];

  return (
    <PageContainer width="medium">
      {/* Hero */}
      <WelcomeHero
        eyebrow="Parent portal"
        title={`${timeOfDayGreeting()}${firstName ? `, ${firstName}` : ""}`}
        subtitle={`Everything about your ${children.length === 1 ? "child's" : "children's"} school day in one place — attendance, homework, results, fees and more.`}
        aside={
          children.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    setSelectedChildId(child.id);
                    setActiveTab("attendance");
                  }}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card py-1.5 pl-1.5 pr-3.5 shadow-xs transition-colors hover:border-input hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="h-8 w-8">
                    {child.photoUrl && <AvatarImage src={child.photoUrl} alt={child.firstName} />}
                    <AvatarFallback className="text-xs">{initialsOf(child.firstName, child.lastName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-left">
                    <span className="block text-sm font-medium leading-tight text-foreground">{child.firstName}</span>
                    <span className="block text-[11px] leading-tight text-muted-foreground">
                      {child.className} - {child.section}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )
        }
      />

      <QuickActionGrid actions={quickActions} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

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
    </PageContainer>
  );
}
