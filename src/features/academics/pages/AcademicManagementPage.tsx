import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AcademicYearsTab from "../components/AcademicYearsTab";
import TermsTab from "../components/TermsTab";
import DepartmentsTab from "../components/DepartmentsTab";
import ClassesSectionsTab from "../components/ClassesSectionsTab";
import SubjectsTab from "../components/SubjectsTab";
import ClassCapacityTab from "../components/ClassCapacityTab";
import AcademicCalendarTab from "../components/AcademicCalendarTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

import { useTranslation } from "react-i18next";
export default function AcademicManagementPage() {
  const { t } = useTranslation("academics");
  return (
    <PageContainer>
      <PageHeader
        title={t("Academic management")}
        description={t("Foundational master data — academic years, terms, departments, classes, sections, and subjects — used across attendance, timetable, and examinations.")}
      />

      <Tabs defaultValue="academic-years">
        <TabsList variant="line">
          <TabsTrigger value="academic-years">{t("Academic Years")}</TabsTrigger>
          <TabsTrigger value="terms">{t("Terms")}</TabsTrigger>
          <TabsTrigger value="departments">{t("Departments")}</TabsTrigger>
          <TabsTrigger value="classes-sections">{t("Classes & Sections")}</TabsTrigger>
          <TabsTrigger value="subjects">{t("Subjects")}</TabsTrigger>
          <TabsTrigger value="capacity">{t("Class Capacity")}</TabsTrigger>
          <TabsTrigger value="calendar">{t("Academic Calendar")}</TabsTrigger>
        </TabsList>
        <TabsContent value="academic-years">
          <AcademicYearsTab />
        </TabsContent>
        <TabsContent value="terms">
          <TermsTab />
        </TabsContent>
        <TabsContent value="departments">
          <DepartmentsTab />
        </TabsContent>
        <TabsContent value="classes-sections">
          <ClassesSectionsTab />
        </TabsContent>
        <TabsContent value="subjects">
          <SubjectsTab />
        </TabsContent>
        <TabsContent value="capacity">
          <ClassCapacityTab />
        </TabsContent>
        <TabsContent value="calendar">
          <AcademicCalendarTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
