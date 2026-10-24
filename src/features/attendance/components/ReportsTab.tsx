import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyAttendanceReport from "./reports/DailyAttendanceReport";
import MonthlyAttendanceReport from "./reports/MonthlyAttendanceReport";
import RangeAttendanceReport from "./reports/RangeAttendanceReport";
import YearlyAttendanceReport from "./reports/YearlyAttendanceReport";

import { useTranslation } from "react-i18next";
export default function ReportsTab() {
  const { t } = useTranslation("attendance");
  return (
    <Tabs defaultValue="daily">
      <TabsList>
        <TabsTrigger value="daily">{t("Daily")}</TabsTrigger>
        <TabsTrigger value="range">{t("Date range")}</TabsTrigger>
        <TabsTrigger value="monthly">{t("Monthly")}</TabsTrigger>
        <TabsTrigger value="yearly">{t("Yearly")}</TabsTrigger>
      </TabsList>
      <TabsContent value="daily">
        <DailyAttendanceReport />
      </TabsContent>
      <TabsContent value="range">
        <RangeAttendanceReport />
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
