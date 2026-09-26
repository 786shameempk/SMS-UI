import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listStudents } from "@/features/students/api";
import { getRemark, getReportCard, listExams, saveRemark } from "../api";
import { EXAM_TYPE_LABELS, gradeBadgeVariant } from "../constants";

export default function ReportCardTab() {
  const queryClient = useQueryClient();
  const { data: students = [] } = useQuery({ queryKey: ["examinations", "all-students"], queryFn: listStudents });
  const { data: exams = [] } = useQuery({ queryKey: ["examinations", "exams"], queryFn: listExams });

  const [studentId, setStudentId] = useState<string | undefined>();
  const [examId, setExamId] = useState<string | undefined>();

  const { data: report, isLoading } = useQuery({
    queryKey: ["examinations", "report-card", examId, studentId],
    queryFn: () => getReportCard(examId as string, studentId as string),
    enabled: Boolean(examId && studentId),
  });

  const { data: remark = "" } = useQuery({
    queryKey: ["examinations", "remark", examId, studentId],
    queryFn: () => getRemark(examId as string, studentId as string),
    enabled: Boolean(examId && studentId),
  });

  const [remarkDraft, setRemarkDraft] = useState("");
  useEffect(() => setRemarkDraft(remark), [remark]);

  const saveRemarkMutation = useMutation({
    mutationFn: () => saveRemark(examId as string, studentId as string, remarkDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examinations", "remark", examId, studentId] });
      toast.success("Remarks saved");
    },
  });

  const exam = exams.find((e) => e.id === examId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select student and exam</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="w-64">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.admissionNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {Boolean(studentId && examId) && !isLoading && !report && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No marks recorded for this student in this exam yet.
          </CardContent>
        </Card>
      )}

      {report && exam && (
        <Card className="max-w-3xl">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-1 border-b border-border pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Report Card</p>
              <h2 className="text-lg font-bold text-foreground">{exam.name}</h2>
              <p className="text-sm text-muted-foreground">
                {EXAM_TYPE_LABELS[exam.examType]} &middot; {exam.startDate} &rarr; {exam.endDate}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Student: </span>
                <span className="font-medium text-foreground">{report.studentName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Admission No.: </span>
                <span className="font-medium text-foreground">{report.admissionNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Class: </span>
                <span className="font-medium text-foreground">
                  {report.className} - {report.section}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Rank in class: </span>
                <span className="font-medium text-foreground">#{report.rank}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Marks obtained</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Max marks</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjects.map((s) => (
                    <tr key={s.subjectId} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {s.subjectName} <span className="text-xs text-muted-foreground">({s.subjectCode})</span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{s.isAbsent ? "Absent" : s.marksObtained}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-secondary-foreground">{s.maxMarks}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge variant={gradeBadgeVariant(s.grade)}>{s.grade}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/40">
                    <td className="px-4 py-2.5 font-semibold text-foreground">Total</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">{report.totalObtained}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">{report.totalMax}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Percentage</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{report.percentage}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Overall grade</p>
                <Badge variant={gradeBadgeVariant(report.grade)} className="mt-1">
                  {report.grade}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">GPA</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{report.gpa.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Rank</p>
                <p className="text-lg font-bold text-foreground tabular-nums">#{report.rank}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Add teacher/principal remarks for this report card…"
                value={remarkDraft}
                onChange={(e) => setRemarkDraft(e.target.value)}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => saveRemarkMutation.mutate()} disabled={saveRemarkMutation.isPending}>
                  {saveRemarkMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Save className="w-3.5 h-3.5" />
                  Save remarks
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
