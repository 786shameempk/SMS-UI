import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import RemarkAssistant from "@/features/ai/components/generation/RemarkAssistant";
import { listStudents } from "@/features/students/api";
import { useAuthStore } from "@/store/authStore";
import { useAiCapabilities } from "@/features/ai/capabilities";
import { getRemark, getReportCard, listExams, saveRemark } from "../api";
import { EXAM_TYPE_LABELS, gradeBadgeVariant } from "../constants";

export default function ReportCardTab() {
  const queryClient = useQueryClient();
  // The school and role include AI Features (same rule as the nav), and the AI service can run this feature.
  const aiModule = useAuthStore((s) => !s.modulePermissions || s.modulePermissions.aiFeatures);
  const { can: canAi } = useAiCapabilities();
  const canUseAi = aiModule && canAi("report-card-comment");
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

            <Table containerClassName="rounded-xl border border-border">
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Marks obtained</TableHead>
                  <TableHead className="text-right">Max marks</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.subjects.map((s) => (
                  <TableRow key={s.subjectId}>
                    <TableCell className="font-medium">
                      {s.subjectName} <span className="text-xs text-muted-foreground">({s.subjectCode})</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.isAbsent ? "Absent" : s.marksObtained}</TableCell>
                    <TableCell className="text-right tabular-nums text-secondary-foreground">{s.maxMarks}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={gradeBadgeVariant(s.grade)}>{s.grade}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow hover={false}>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{report.totalObtained}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{report.totalMax}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>

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
              {canUseAi && examId && studentId && (
                <RemarkAssistant key={`${examId}-${studentId}`} examId={examId} studentId={studentId} onUse={setRemarkDraft} />
              )}
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
