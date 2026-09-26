import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Star } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { RATING_SCALE, RESPONDENT_TYPE_OPTIONS } from "../constants";
import { listSurveys, recordResponse } from "../api";
import type { RespondentType, Survey } from "../types";

export default function RecordResponseTab() {
  const queryClient = useQueryClient();
  const { data: surveys = [] } = useQuery({ queryKey: ["surveys", "published"], queryFn: () => listSurveys("published") });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const [surveyId, setSurveyId] = useState("");
  const [respondentType, setRespondentType] = useState<RespondentType>("student");
  const [respondentStudentId, setRespondentStudentId] = useState("");
  const [respondentStaffId, setRespondentStaffId] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const survey: Survey | undefined = surveys.find((s) => s.id === surveyId);

  useEffect(() => {
    setAnswers({});
    setRespondentStudentId("");
    setRespondentStaffId("");
    setRespondentName("");
  }, [surveyId]);

  const mutation = useMutation({
    mutationFn: recordResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast.success("Response recorded");
      setAnswers({});
      setRespondentStudentId("");
      setRespondentStaffId("");
      setRespondentName("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not record response"),
  });

  const canSubmit =
    Boolean(survey) &&
    (respondentType !== "student" || Boolean(respondentStudentId)) &&
    (respondentType !== "staff" || Boolean(respondentStaffId)) &&
    (respondentType !== "parent" || respondentName.trim().length > 0) &&
    survey?.questions.every((q) => !q.required || (answers[q.id] ?? "").trim().length > 0);

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Record a response</CardTitle>
          <CardDescription>Log a response on behalf of a respondent for a published survey.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resp-survey">Survey</Label>
            <Select value={surveyId} onValueChange={setSurveyId}>
              <SelectTrigger id="resp-survey">
                <SelectValue placeholder="Select a published survey" />
              </SelectTrigger>
              <SelectContent>
                {surveys.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {surveys.length === 0 && <p className="text-xs text-muted-foreground">No published surveys are open for responses right now.</p>}
          </div>

          {survey && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="resp-type">Respondent</Label>
                <Select value={respondentType} onValueChange={(v) => setRespondentType(v as RespondentType)}>
                  <SelectTrigger id="resp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONDENT_TYPE_OPTIONS.filter((o) => o.value !== "anonymous" || survey.anonymousAllowed).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {respondentType === "student" && (
                <div className="space-y-1.5">
                  <Label htmlFor="resp-student">Student</Label>
                  <Select value={respondentStudentId} onValueChange={setRespondentStudentId}>
                    <SelectTrigger id="resp-student">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} · {s.className} - {s.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {respondentType === "staff" && (
                <div className="space-y-1.5">
                  <Label htmlFor="resp-staff">Staff member</Label>
                  <Select value={respondentStaffId} onValueChange={setRespondentStaffId}>
                    <SelectTrigger id="resp-staff">
                      <SelectValue placeholder="Select a staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} · {s.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {respondentType === "parent" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="resp-parentName">Parent/guardian name</Label>
                    <Input id="resp-parentName" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="resp-parentChild" optional>Child</Label>
                    <Select value={respondentStudentId} onValueChange={setRespondentStudentId}>
                      <SelectTrigger id="resp-parentChild">
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} · {s.className} - {s.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2 border-t border-border">
                {survey.questions.map((question) => (
                  <div key={question.id} className="space-y-1.5">
                    <Label>
                      {question.text}
                      {question.required && <span className="text-destructive-strong ml-0.5">*</span>}
                    </Label>

                    {question.type === "rating" && (
                      <div className="flex items-center gap-1.5">
                        {RATING_SCALE.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: String(n) }))}
                            className={cn(
                              "w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
                              Number(answers[question.id]) >= n ? "border-amber-400 bg-warning-soft text-amber-500" : "border-border text-muted-foreground/70",
                            )}
                          >
                            <Star className={cn("w-4 h-4", Number(answers[question.id]) >= n && "fill-amber-400")} />
                          </button>
                        ))}
                      </div>
                    )}

                    {question.type === "multiple_choice" && (
                      <Select value={answers[question.id] ?? ""} onValueChange={(v) => setAnswers((prev) => ({ ...prev, [question.id]: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {(question.options ?? []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {question.type === "yes_no" && (
                      <div className="flex items-center gap-2">
                        {["yes", "no"].map((v) => (
                          <Button
                            key={v}
                            type="button"
                            size="sm"
                            variant={answers[question.id] === v ? "default" : "outline"}
                            onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: v }))}
                          >
                            {v === "yes" ? "Yes" : "No"}
                          </Button>
                        ))}
                      </div>
                    )}

                    {question.type === "text" && (
                      <Textarea rows={2} value={answers[question.id] ?? ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>

              <Button
                disabled={!canSubmit || mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    surveyId: survey.id,
                    respondentType,
                    respondentStudentId: respondentType === "student" || respondentType === "parent" ? respondentStudentId || undefined : undefined,
                    respondentStaffId: respondentType === "staff" ? respondentStaffId : undefined,
                    respondentName: respondentType === "parent" ? respondentName : undefined,
                    answers: survey.questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? "" })),
                  })
                }
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Send className="w-4 h-4" />
                Submit response
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
