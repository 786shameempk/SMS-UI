import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AllocationsTab from "../components/AllocationsTab";
import HostelAttendanceTab from "../components/HostelAttendanceTab";
import HostelFeesTab from "../components/HostelFeesTab";
import HostelsTab from "../components/HostelsTab";
import MessMenuTab from "../components/MessMenuTab";
import VisitorRegisterTab from "../components/VisitorRegisterTab";

export default function HostelManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Hostel management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage hostels, rooms and beds, student allocation, the visitor register, hostel attendance, fees, and the mess menu.
        </p>
      </div>

      <Tabs defaultValue="hostels">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="hostels">Hostels & Rooms</TabsTrigger>
          <TabsTrigger value="allocations">Student Allocation</TabsTrigger>
          <TabsTrigger value="visitors">Visitor Register</TabsTrigger>
          <TabsTrigger value="attendance">Hostel Attendance</TabsTrigger>
          <TabsTrigger value="fees">Hostel Fees</TabsTrigger>
          <TabsTrigger value="mess">Mess Menu</TabsTrigger>
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
    </div>
  );
}
