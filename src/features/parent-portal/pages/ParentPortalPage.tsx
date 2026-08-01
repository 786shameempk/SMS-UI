import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
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

export default function ParentPortalPage() {
  const user = useAuthStore((s) => s.user);
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

  return (
    <div className="p-6 space-y-5 max-w-[1000px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Parent portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""} — track attendance, homework, results, and fees for your children.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="homework">Homework</TabsTrigger>
            <TabsTrigger value="exams">Exam Results</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
