import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Check, Plus, Trash2, X } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { deleteAchievement, listAchievements, saveAchievement, setAchievementStatus } from "../api";
import { ACHIEVEMENT_STATUS_LABEL, LEVELS } from "../constants";
import { SelectField, formatDate, options, todayIso, useAcademicYears, useApiMutation, useExtracurricularAccess, useStudentOptions } from "../shared";
import type { Achievement, AchievementStatus } from "../types";

export default function AchievementsPage() {
  const access = useExtracurricularAccess();
  const years = useAcademicYears();
  const [status, setStatus] = useState<AchievementStatus | undefined>();
  const [year, setYear] = useState<string | undefined>();
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<Achievement | null>(null);

  const filters = { status, academicYear: year, pageSize: 100 };
  const achievements = useQuery({ queryKey: ["extracurricular", "achievements", filters], queryFn: () => listAchievements(filters) });
  const decide = useApiMutation(({ id, status: s }: { id: string; status: AchievementStatus }) => setAchievementStatus([id], s), { success: "Updated" });
  const remove = useApiMutation(deleteAchievement, { success: "Achievement deleted", onSuccess: () => setRemoving(null) });
  const items = achievements.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {!access.isFamily && (
          <div className="w-48">
            <SelectField value={status} onChange={setStatus} allLabel="Any status" items={options(ACHIEVEMENT_STATUS_LABEL)} />
          </div>
        )}
        <div className="w-32">
          <SelectField value={year} onChange={setYear} allLabel="Any year" items={years.names.map((n) => ({ value: n, label: n }))} />
        </div>
        {!access.isFamily && (
          <Button className="ml-auto" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Record an achievement
          </Button>
        )}
      </div>

      {achievements.isError && <ErrorState onRetry={() => achievements.refetch()} retrying={achievements.isFetching} />}
      {achievements.isLoading && <Skeleton className="h-40 w-full" />}
      {achievements.data && items.length === 0 && (
        <EmptyState icon={Award} title="No achievements yet" description={access.isFamily ? "Published awards and certificates appear here." : "Record medals, trophies and recognitions. They stay private until someone approves them."} />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{a.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.studentName}</p>
                </div>
                {!access.isFamily && <StatusBadge status={a.status} label={ACHIEVEMENT_STATUS_LABEL[a.status]} />}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.awardType && <Badge variant="brand">{a.awardType}</Badge>}
                {a.level && <Badge variant="info">{a.level}</Badge>}
                <Badge variant="neutral">{formatDate(a.date)}</Badge>
              </div>
              {a.description && <p className="line-clamp-3 text-sm text-secondary-foreground">{a.description}</p>}
              {a.evidenceUrl && (
                <a href={a.evidenceUrl} target="_blank" rel="noreferrer noopener" className="text-xs text-primary hover:underline">
                  View supporting document
                </a>
              )}
              {!access.isFamily && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {access.canApprove && a.status !== "Published" && (
                    <Button size="sm" onClick={() => decide.mutate({ id: a.id, status: "Published" })}><Check className="h-3.5 w-3.5" /> Publish</Button>
                  )}
                  {access.canApprove && a.status === "Pending" && (
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, status: "Rejected" })}><X className="h-3.5 w-3.5" /> Reject</Button>
                  )}
                  {access.canApprove && a.status === "Published" && (
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, status: "Pending" })}>Unpublish</Button>
                  )}
                  {a.status !== "Published" && <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setFormOpen(true); }}>Edit</Button>}
                  {access.canManage && a.status !== "Published" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${a.title}`} onClick={() => setRemoving(a)}><Trash2 className="h-3.5 w-3.5 text-destructive-strong" /></Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AchievementFormDialog open={formOpen} onOpenChange={setFormOpen} achievement={editing} years={years.names} currentYear={years.current} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Delete achievement"
        description={`Delete "${removing?.title}" for ${removing?.studentName}?`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
      />
    </div>
  );
}

function AchievementFormDialog({ open, onOpenChange, achievement, years, currentYear }: { open: boolean; onOpenChange: (o: boolean) => void; achievement: Achievement | null; years: string[]; currentYear: string }) {
  const students = useStudentOptions(open);
  const [v, setV] = useState({ studentId: "", title: "", awardType: "", level: "", date: todayIso(), description: "", evidenceUrl: "", academicYear: currentYear });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setV(achievement
      ? { studentId: achievement.studentId, title: achievement.title, awardType: achievement.awardType ?? "", level: achievement.level ?? "", date: achievement.date, description: achievement.description ?? "", evidenceUrl: achievement.evidenceUrl ?? "", academicYear: achievement.academicYear }
      : { studentId: "", title: "", awardType: "", level: "", date: todayIso(), description: "", evidenceUrl: "", academicYear: currentYear });
  }, [open, achievement, currentYear]);

  const save = useApiMutation(saveAchievement, { success: "Saved. It stays private until it is published.", onSuccess: () => onOpenChange(false) });
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((s) => ({ ...s, [k]: x }));
  const errors = { studentId: !v.studentId ? "Choose a student" : undefined, title: !v.title.trim() ? "Title is required" : undefined, evidenceUrl: v.evidenceUrl && !/^https?:\/\//i.test(v.evidenceUrl) ? "Use a web address starting with http:// or https://" : undefined };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{achievement ? "Edit achievement" : "Record an achievement"}</DialogTitle>
          <DialogDescription>Medals, trophies, certificates and participation recognition.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (Object.values(errors).some(Boolean)) return; save.mutate({ id: achievement?.id, studentId: v.studentId, title: v.title.trim(), awardType: v.awardType.trim() || null, level: v.level || null, date: v.date, activityId: achievement?.activityId ?? null, eventId: achievement?.eventId ?? null, description: v.description.trim() || null, evidenceUrl: v.evidenceUrl.trim() || null, academicYear: v.academicYear }); }}>
          <FormField label="Student" htmlFor="ach-student" required error={touched ? errors.studentId : undefined}>
            <Combobox aria-label="Student" value={v.studentId || null} onValueChange={(x) => set("studentId", x)} options={students.options} placeholder={students.isLoading ? "Loading…" : "Choose a student"} disabled={Boolean(achievement)} />
          </FormField>
          <FormField label="Title" htmlFor="ach-title" required error={touched ? errors.title : undefined}>
            <Input id="ach-title" value={v.title} onChange={(e) => set("title", e.target.value)} aria-invalid={touched && errors.title ? true : undefined} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Award" htmlFor="ach-type" optional hint="Gold medal, Trophy, Certificate…"><Input id="ach-type" value={v.awardType} onChange={(e) => set("awardType", e.target.value)} /></FormField>
            <FormField label="Level" htmlFor="ach-level" optional><SelectField id="ach-level" value={v.level || undefined} onChange={(x) => set("level", x ?? "")} allLabel="Not set" items={LEVELS.map((l) => ({ value: l, label: l }))} /></FormField>
            <FormField label="Date" htmlFor="ach-date"><Input id="ach-date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} /></FormField>
            <FormField label="Academic year" htmlFor="ach-year"><SelectField id="ach-year" value={v.academicYear} onChange={(x) => x && set("academicYear", x)} items={years.map((y) => ({ value: y, label: y }))} /></FormField>
          </div>
          <FormField label="Description" htmlFor="ach-desc" optional><Textarea id="ach-desc" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} /></FormField>
          <FormField label="Supporting document link" htmlFor="ach-evidence" optional error={touched ? errors.evidenceUrl : undefined} hint="A photo or certificate stored in the school's files">
            <Input id="ach-evidence" value={v.evidenceUrl} onChange={(e) => set("evidenceUrl", e.target.value)} aria-invalid={touched && errors.evidenceUrl ? true : undefined} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{achievement ? "Save changes" : "Record"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
