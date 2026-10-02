import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExamGenerator from "./generation/ExamGenerator";
import { HomeworkGenerator, LessonPlanGenerator, WorksheetGenerator } from "./generation/OtherGenerators";
import QuestionGenerator from "./generation/QuestionGenerator";

/** Teacher tools. Everything generated here is a draft; the AI service never publishes anything. */
export default function GeneratorsTab() {
  return (
    <Tabs defaultValue="questions">
      <TabsList>
        <TabsTrigger value="questions">Questions</TabsTrigger>
        <TabsTrigger value="exam">Exam paper</TabsTrigger>
        <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
        <TabsTrigger value="lesson">Lesson plan</TabsTrigger>
        <TabsTrigger value="homework">Homework</TabsTrigger>
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
