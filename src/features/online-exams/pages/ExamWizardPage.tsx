import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Rocket, Save, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField, FormRow, FormSection } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listClasses, listSections, listSubjects } from "@/features/academics/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { createOnlineExam, getAuthoringOptions, getOnlineExam, listAssignableStudents, scheduleOnlineExam, updateOnlineExam } from "../api";
import { EXAM_TYPE_LABEL, EXAM_TYPES, formatMarks, isExamStaff } from "../constants";
import { COMMON_TIME_ZONES } from "../timeZone";
import type { ExamSettings, OnlineExamType } from "../types";
import AssignStep, { assignedStudents } from "../components/wizard/AssignStep";
import QuestionsStep from "../components/wizard/QuestionsStep";
import ReviewStep from "../components/wizard/ReviewStep";
import { ALL_SECTIONS, emptyWizard, fromDetail, publishBlockers, STEPS, toInput, totalMarks, validateStep, type WizardState } from "../components/wizard/wizardState";

const NONE = "__none";

function Stepper({ step, maxVisited, onGo }: { step: number; maxVisited: number; onGo: (s: number) => void }) {
  const listRef = useRef<HTMLOListElement>(null);
  // Keep the current step visible when the strip scrolls sideways (phones, narrow windows).
  useEffect(() => {
    listRef.current?.querySelector("[aria-current=step]")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [step]);
  return (
    <nav aria-label="Exam setup steps">
      <p className="mb-2 text-sm font-medium text-muted-foreground sm:hidden">
        Step {step + 1} of {STEPS.length}: <span className="text-foreground">{STEPS[step]}</span>
      </p>
      <ol ref={listRef} className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden">
        {STEPS.map((label, i) => {
          const done = i < step;
          const reachable = i <= maxVisited;
          return (
            <li key={label} className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => reachable && onGo(i)}
                disabled={!reachable}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-sm transition-colors sm:pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  reachable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                  i === step ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                    i === step ? "bg-primary text-primary-foreground" : done ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden font-medium sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-3 bg-border sm:w-6" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border/80 px-4 py-3 hover:bg-secondary/30">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  );
}

export default function ExamWizardPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);

  const [state, setState] = useState<WizardState>(emptyWizard);
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | "draft" | "schedule" | "now">(null);
  const [loaded, setLoaded] = useState(!isEdit);

  const existing = useQuery({ queryKey: ["online-exams", "detail", id], queryFn: () => getOnlineExam(id!), enabled: isEdit });
  const subjects = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const classes = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const sections = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const options = useQuery({ queryKey: ["online-exams", "authoring-options"], queryFn: getAuthoringOptions });
  const students = useQuery({
    queryKey: ["online-exams", "assignable-students", state.classId],
    queryFn: () => listAssignableStudents(state.classId),
    enabled: !!state.classId,
  });

  useEffect(() => {
    if (existing.data && !loaded) {
      setState(fromDetail(existing.data));
      setMaxVisited(STEPS.length - 1);
      setLoaded(true);
    }
  }, [existing.data, loaded]);

  const update = (fn: (s: WizardState) => WizardState) => setState((s) => fn(s));
  // Editing a field clears its error; the rest stay until the step is checked again.
  const clearError = (key: string) => setErrors((e) => (e[key] ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    clearError(key);
    if (key === "startDate" || key === "startTime" || key === "endDate" || key === "endTime") clearError("window");
    setState((s) => ({ ...s, [key]: value }));
  };
  const setSetting = <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => {
    clearError(key);
    setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  };

  const classSubjects = useMemo(() => {
    const all = subjects.data ?? [];
    const forClass = all.filter((s) => !state.classId || s.classIds.length === 0 || s.classIds.includes(state.classId));
    return forClass.length ? forClass : all;
  }, [subjects.data, state.classId]);
  const classSections = (sections.data ?? []).filter((s) => s.classId === state.classId);
  const assigned = assignedStudents(state, students.data ?? []);
  const blockers = publishBlockers(state, assigned.length);
  const status = existing.data?.status;
  const canSchedule = !isEdit || status === "Draft";

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my" replace />;
  if (isEdit && existing.isError) {
    return (
      <PageContainer>
        <ErrorState title="This exam couldn't load" onRetry={() => existing.refetch()} retrying={existing.isRefetching} />
      </PageContainer>
    );
  }
  if (!loaded) return <PageSkeleton />;
  if (existing.data && existing.data.hasAttempts) {
    return (
      <PageContainer>
        <ErrorState title="This exam can't be edited any more" description="Students have already started it. Duplicate it to reuse the questions." />
      </PageContainer>
    );
  }

  const goTo = (target: number) => {
    // Moving forward checks every step in between; going back is always allowed.
    for (let s = step; s < target; s++) {
      const e = validateStep(s, state);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        toast.error(Object.values(e)[0]);
        return;
      }
    }
    setErrors({});
    setStep(target);
    setMaxVisited((m) => Math.max(m, target));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (mode: "draft" | "schedule" | "now") => {
    for (let s = 0; s < STEPS.length - 1; s++) {
      const e = validateStep(s, state);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        toast.error(Object.values(e)[0]);
        return;
      }
    }
    if (mode !== "draft" && blockers.length) {
      toast.error(blockers[0]);
      return;
    }
    setSaving(mode);
    try {
      const input = toInput(state);
      const saved = isEdit ? await updateOnlineExam(id!, input) : await createOnlineExam(input);
      if (mode !== "draft" && saved.status === "Draft") await scheduleOnlineExam(saved.id, mode === "now");
      await queryClient.invalidateQueries({ queryKey: ["online-exams"] });
      toast.success(mode === "draft" ? "Saved as draft" : mode === "now" ? "Exam published and open now" : isEdit && status !== "Draft" ? "Changes saved" : "Exam scheduled - students have been notified");
      navigate(`/online-exams/exams/${saved.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the exam");
    } finally {
      setSaving(null);
    }
  };

  const subjectName = subjects.data?.find((s) => s.id === state.subjectId)?.name;
  const className = classes.data?.find((c) => c.id === state.classId)?.name;

  return (
    <PageContainer width="medium">
      <PageHeader
        title={isEdit ? `Edit ${existing.data?.name ?? "exam"}` : "Create exam"}
        description={isEdit && status !== "Draft" ? "This exam is scheduled. Students are notified again if you change its start time." : "Set it up in six steps. You can save a draft at any point."}
        actions={
          <Button variant="outline" onClick={() => void save("draft")} loading={saving === "draft"} disabled={!!saving}>
            <Save className="h-4 w-4" />
            {isEdit && status !== "Draft" ? "Save changes" : "Save draft"}
          </Button>
        }
      />

      <Stepper step={step} maxVisited={maxVisited} onGo={goTo} />

      <Card>
        <CardContent className="pt-[var(--space-card-padding)]">
          {step === 0 && (
            <div className="space-y-4">
              <FormField label="Exam name" htmlFor="ex-name" required error={errors.name}>
                <Input id="ex-name" value={state.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Algebra unit test" maxLength={200} aria-invalid={errors.name ? true : undefined} />
              </FormField>
              <FormField label="Description / instructions" htmlFor="ex-desc" optional hint="Students see this before they start.">
                <Textarea id="ex-desc" rows={3} value={state.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
              </FormField>
              <FormRow>
                <FormField label="Academic year" htmlFor="ex-year" optional>
                  <Select value={state.academicYearId ?? NONE} onValueChange={(v) => set("academicYearId", v === NONE ? null : v)}>
                    <SelectTrigger id="ex-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not set</SelectItem>
                      {(options.data?.academicYears ?? []).map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Exam type" htmlFor="ex-type" required>
                  <Select value={state.examType} onValueChange={(v) => set("examType", v as OnlineExamType)}>
                    <SelectTrigger id="ex-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {EXAM_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Class" htmlFor="ex-class" required error={errors.classId}>
                  <Select
                    value={state.classId}
                    onValueChange={(v) => {
                      clearError("classId");
                      update((s) => ({ ...s, classId: v, sectionId: ALL_SECTIONS, sectionIds: [], studentIds: [], assignMode: "class" }));
                    }}
                  >
                    <SelectTrigger id="ex-class" aria-invalid={errors.classId ? true : undefined}>
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {(classes.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Section" htmlFor="ex-section" optional>
                  <Select
                    value={state.sectionId}
                    onValueChange={(v) => update((s) => ({ ...s, sectionId: v, assignMode: v === ALL_SECTIONS ? "class" : "sections", sectionIds: v === ALL_SECTIONS ? [] : [v] }))}
                    disabled={!state.classId}
                  >
                    <SelectTrigger id="ex-section">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_SECTIONS}>All sections</SelectItem>
                      {classSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          Section {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Subject" htmlFor="ex-subject" required error={errors.subjectId}>
                  <Select value={state.subjectId} onValueChange={(v) => set("subjectId", v)}>
                    <SelectTrigger id="ex-subject" aria-invalid={errors.subjectId ? true : undefined}>
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {classSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Teacher" htmlFor="ex-teacher" optional hint="Evaluates and publishes results with you.">
                  <Select value={state.teacherStaffId ?? NONE} onValueChange={(v) => set("teacherStaffId", v === NONE ? null : v)}>
                    <SelectTrigger id="ex-teacher">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{role === "teacher" ? "Me" : "Not assigned"}</SelectItem>
                      {(options.data?.teachers ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <FormSection title="Exam window" description="Students can start any time in this window. Each student gets the full duration, but never past the end time.">
                <FormRow>
                  <FormField label="Start date" htmlFor="ex-sd" required>
                    <Input id="ex-sd" type="date" value={state.startDate} onChange={(e) => set("startDate", e.target.value)} />
                  </FormField>
                  <FormField label="Start time" htmlFor="ex-st" required>
                    <Input id="ex-st" type="time" value={state.startTime} onChange={(e) => set("startTime", e.target.value)} />
                  </FormField>
                </FormRow>
                <FormRow>
                  <FormField label="End date" htmlFor="ex-ed" required>
                    <Input id="ex-ed" type="date" value={state.endDate} onChange={(e) => set("endDate", e.target.value)} />
                  </FormField>
                  <FormField label="End time" htmlFor="ex-et" required error={errors.window}>
                    <Input id="ex-et" type="time" value={state.endTime} onChange={(e) => set("endTime", e.target.value)} />
                  </FormField>
                </FormRow>
              </FormSection>
              <FormRow>
                <FormField label="Exam duration (minutes)" htmlFor="ex-dur" required error={errors.durationMinutes} hint="The countdown each student gets once they start.">
                  <Input id="ex-dur" type="number" min={1} max={600} value={Number.isFinite(state.durationMinutes) ? state.durationMinutes : ""} onChange={(e) => set("durationMinutes", e.target.value === "" ? NaN : Number(e.target.value))} />
                </FormField>
                <FormField label="Time zone" htmlFor="ex-tz" required hint="Times above are read in this zone.">
                  <Select value={state.timeZoneId} onValueChange={(v) => set("timeZoneId", v)}>
                    <SelectTrigger id="ex-tz">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set([state.timeZoneId, ...COMMON_TIME_ZONES])).map((z) => (
                        <SelectItem key={z} value={z}>
                          {z.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <FormRow cols={3}>
                <FormField label="Total marks" hint="Comes from the questions' marks.">
                  <Input value={formatMarks(totalMarks(state))} readOnly disabled aria-label="Total marks" />
                </FormField>
                <FormField label="Passing marks" htmlFor="ex-pass" required error={errors.passingMarks}>
                  <Input id="ex-pass" type="number" min={0} step={0.5} value={Number.isFinite(state.settings.passingMarks) ? state.settings.passingMarks : ""} onChange={(e) => setSetting("passingMarks", e.target.value === "" ? NaN : Number(e.target.value))} />
                </FormField>
                <FormField label="Number of attempts" htmlFor="ex-att" required error={errors.maxAttempts}>
                  <Input id="ex-att" type="number" min={1} max={5} value={Number.isFinite(state.settings.maxAttempts) ? state.settings.maxAttempts : ""} onChange={(e) => setSetting("maxAttempts", e.target.value === "" ? NaN : Number(e.target.value))} />
                </FormField>
              </FormRow>
              <div className="grid gap-2 md:grid-cols-2">
                <Toggle label="Shuffle questions" hint="Each student gets their own order." checked={state.settings.shuffleQuestions} onChange={(v) => setSetting("shuffleQuestions", v)} />
                <Toggle label="Shuffle options" hint="Answer choices appear in a different order." checked={state.settings.shuffleOptions} onChange={(v) => setSetting("shuffleOptions", v)} />
                <Toggle label="Show question numbers" hint="Number questions in the exam screen." checked={state.settings.showQuestionNumbers} onChange={(v) => setSetting("showQuestionNumbers", v)} />
                <Toggle label="Allow back navigation" hint="Students can return to earlier questions." checked={state.settings.allowBackNavigation} onChange={(v) => setSetting("allowBackNavigation", v)} />
                <Toggle label="Auto submit when time expires" hint="The server always closes the attempt at time-up." checked={state.settings.autoSubmitOnTimeout} onChange={(v) => setSetting("autoSubmitOnTimeout", v)} />
                <Toggle label="Allow review before submit" hint="Show a summary of answered and marked questions." checked={state.settings.allowReviewBeforeSubmit} onChange={(v) => setSetting("allowReviewBeforeSubmit", v)} />
                <Toggle label="Show result immediately" hint="Fully auto-marked results appear right after submitting." checked={state.settings.showResultImmediately} onChange={(v) => setSetting("showResultImmediately", v)} />
                <Toggle label="Show answers with results" hint="Students see correct answers and explanations." checked={state.settings.showAnswersInResult} onChange={(v) => setSetting("showAnswersInResult", v)} />
              </div>
              <FormField label="Negative marking" htmlFor="ex-neg" optional error={errors.negativeMarkPerWrong} hint="Marks deducted per wrong objective answer. 0 turns it off.">
                <Input id="ex-neg" type="number" min={0} step={0.25} className="max-w-[10rem]" value={Number.isFinite(state.settings.negativeMarkPerWrong) ? state.settings.negativeMarkPerWrong : ""} onChange={(e) => setSetting("negativeMarkPerWrong", e.target.value === "" ? NaN : Number(e.target.value))} />
              </FormField>
            </div>
          )}

          {step === 3 && <QuestionsStep state={state} update={update} subjectName={subjectName} error={errors.questions} />}

          {step === 4 && (
            <AssignStep
              state={state}
              update={update}
              className={className}
              sections={sections.data ?? []}
              students={students.data ?? []}
              loading={students.isLoading}
              failed={students.isError}
              onRetry={() => students.refetch()}
              error={errors.assign}
            />
          )}

          {step === 5 && (
            <ReviewStep
              state={state}
              assignedCount={assigned.length}
              blockers={blockers}
              onEditStep={setStep}
              labels={{
                subject: subjectName,
                className,
                section: state.sectionId === ALL_SECTIONS ? undefined : `Section ${classSections.find((s) => s.id === state.sectionId)?.name ?? ""}`,
                teacher: options.data?.teachers.find((t) => t.id === state.teacherStaffId)?.name,
                year: options.data?.academicYears.find((y) => y.id === state.academicYearId)?.name,
              }}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => (step === 0 ? navigate(-1) : goTo(step - 1))} disabled={!!saving}>
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => goTo(step + 1)}>
            Next: {STEPS[step + 1]}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => void save("draft")} loading={saving === "draft"} disabled={!!saving}>
              <Save className="h-4 w-4" />
              {isEdit && !canSchedule ? "Save changes" : "Save draft"}
            </Button>
            {canSchedule && (
              <>
                <Button variant="outline" onClick={() => void save("schedule")} loading={saving === "schedule"} disabled={!!saving || blockers.length > 0}>
                  <Send className="h-4 w-4" />
                  Schedule exam
                </Button>
                <Button onClick={() => void save("now")} loading={saving === "now"} disabled={!!saving || blockers.length > 0} title="Opens the exam immediately">
                  <Rocket className="h-4 w-4" />
                  Publish now
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
