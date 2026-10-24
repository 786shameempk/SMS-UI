import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExamGenerator from "./generation/ExamGenerator";
import { HomeworkGenerator, LessonPlanGenerator, WorksheetGenerator } from "./generation/OtherGenerators";
import QuestionGenerator from "./generation/QuestionGenerator";

/** Teacher tools. Everything generated here is a draft; the AI service never publishes anything. */
export default function GeneratorsTab() {
  const { t } = useTranslation("ai");
  return (
    <Tabs defaultValue="questions">
      <TabsList>
        <TabsTrigger value="questions">{t("Questions")}</TabsTrigger>
        <TabsTrigger value="exam">{t("Exam paper")}</TabsTrigger>
        <TabsTrigger value="worksheet">{t("Worksheet")}</TabsTrigger>
        <TabsTrigger value="lesson">{t("Lesson plan")}</TabsTrigger>
        <TabsTrigger value="homework">{t("Homework")}</TabsTrigger>
      </TabsList>
      <TabsContent value="questions">
        <QuestionGenerator />
      </TabsContent>
      <TabsContent value="exam">
        <ExamGenerator />
      </TabsContent>
      <TabsContent value="worksheet">
        <WorksheetGenerator />
      </TabsContent>
      <TabsContent value="lesson">
        <LessonPlanGenerator />
      </TabsContent>
      <TabsContent value="homework">
        <HomeworkGenerator />
      </TabsContent>
    </Tabs>
  );
}
