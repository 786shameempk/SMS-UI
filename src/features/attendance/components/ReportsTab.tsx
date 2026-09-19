import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyAttendanceReport from "./reports/DailyAttendanceReport";
import MonthlyAttendanceReport from "./reports/MonthlyAttendanceReport";
import YearlyAttendanceReport from "./reports/YearlyAttendanceReport";

export default function ReportsTab() {
  return (
    <Tabs defaultValue="daily">
      <TabsList>
        <TabsTrigger value="daily">Daily</TabsTrigger>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
        <TabsTrigger value="yearly">Yearly</TabsTrigger>
      </TabsList>
      <TabsContent value="daily">
        <DailyAttendanceReport />
      </TabsContent>
      <TabsContent value="monthly">
        <MonthlyAttendanceReport />
      </TabsContent>
      <TabsContent value="yearly">
        <YearlyAttendanceReport />
      </TabsContent>
    </Tabs>
  );
}
