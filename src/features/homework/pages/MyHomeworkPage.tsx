import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listStudents } from "@/features/students/api";
import MyHomeworkListTab from "../components/MyHomeworkListTab";
import MyResourcesTab from "../components/MyResourcesTab";

export default function MyHomeworkPage() {
  const { data: students = [], isLoading } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const activeStudents = useMemo(() => students.filter((s) => s.status === "active"), [students]);
  const [studentId, setStudentId] = useState<string>("");

  useEffect(() => {
    if (!studentId && activeStudents.length > 0) setStudentId(activeStudents[0].id);
  }, [activeStudents, studentId]);

  return (
    <div className="p-6 space-y-5 max-w-[1000px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My homework</h1>
          <p className="text-sm text-slate-500 mt-1">Assigned homework, learning resources, and quizzes for the selected student.</p>
        </div>
        <div className="w-56">
          <Select value={studentId} onValueChange={setStudentId} disabled={isLoading || activeStudents.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder="Select a student" />
            </SelectTrigger>
            <SelectContent>
              {activeStudents.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} · {s.className}-{s.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {studentId ? (
        <Tabs defaultValue="homework">
          <TabsList>
            <TabsTrigger value="homework">My Homework</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>
          <TabsContent value="homework">
            <MyHomeworkListTab studentId={studentId} />
          </TabsContent>
          <TabsContent value="resources">
            <MyResourcesTab studentId={studentId} />
          </TabsContent>
        </Tabs>
      ) : (
        !isLoading && <p className="text-sm text-muted-foreground">No students found.</p>
      )}
    </div>
  );
}
