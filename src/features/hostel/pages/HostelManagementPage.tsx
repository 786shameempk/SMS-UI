import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AllocationsTab from "../components/AllocationsTab";
import HostelAttendanceTab from "../components/HostelAttendanceTab";
import HostelFeesTab from "../components/HostelFeesTab";
import HostelsTab from "../components/HostelsTab";
import MessMenuTab from "../components/MessMenuTab";
import VisitorRegisterTab from "../components/VisitorRegisterTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function HostelManagementPage() {
  const { t } = useTranslation("hostel");
  return (
    <PageContainer>
      <PageHeader
        title={t("Hostel management")}
        description={t("Manage hostels, rooms and beds, student allocation, the visitor register, hostel attendance, fees, and the mess menu.")}
      />

      <Tabs defaultValue="hostels">
        <TabsList variant="line">
          <TabsTrigger value="hostels">{t("Hostels & Rooms")}</TabsTrigger>
          <TabsTrigger value="allocations">{t("Student Allocation")}</TabsTrigger>
          <TabsTrigger value="visitors">{t("Visitor Register")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("Hostel Attendance")}</TabsTrigger>
          <TabsTrigger value="fees">{t("Hostel Fees")}</TabsTrigger>
          <TabsTrigger value="mess">{t("Mess Menu")}</TabsTrigger>
        </TabsList>
        <TabsContent value="hostels">
          <HostelsTab />
        </TabsContent>
        <TabsContent value="allocations">
          <AllocationsTab />
        </TabsContent>
        <TabsContent value="visitors">
          <VisitorRegisterTab />
        </TabsContent>
        <TabsContent value="attendance">
          <HostelAttendanceTab />
        </TabsContent>
        <TabsContent value="fees">
          <HostelFeesTab />
        </TabsContent>
        <TabsContent value="mess">
          <MessMenuTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
