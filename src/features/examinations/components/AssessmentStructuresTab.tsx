import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAcademicYears, listClasses, listSubjects } from "@/features/academics/api";
import { extractApiErrorMessage } from "@/lib/httpClient";
import {
  archiveAssessmentStructure,
  deleteAssessmentAssignment,
  duplicateAssessmentStructure,
  listAssessmentAssignments,
  listAssessmentStructures,
  saveAssessmentAssignment,
  saveAssessmentStructure,
} from "../api";
import { BOARD_OPTIONS, validateComponents } from "../assessmentPresets";
import type { AssessmentStructure, AssessmentStructureForm } from "../types";
import ComponentEditor from "./ComponentEditor";

const ANY = "__any__";
const EMPTY: AssessmentStructureForm = { name: "", board: "", description: "", components: [{ label: "", max: 100, optional: false, counts: true, showOnCard: true }] };

/** Where a school defines how marks are collected (its assessment structures) and which class and subject each one applies to. */
export default function AssessmentStructuresTab() {
  const { t } = useTranslation("examinations");
  const queryClient = useQueryClient();
  const { data: structures = [] } = useQuery({ queryKey: ["examinations", "assessment-structures"], queryFn: () => listAssessmentStructures() });
  const { data: assignments = [] } = useQuery({ queryKey: ["examinations", "assessment-assignments"], queryFn: listAssessmentAssignments });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: years = [] } = useQuery({ queryKey: ["academics", "academic-years"], queryFn: listAcademicYears });

  const [editing, setEditing] = useState<AssessmentStructure | null>(null);
  const [form, setForm] = useState<AssessmentStructureForm | null>(null);
  const [target, setTarget] = useState({ structureId: "", classId: ANY, subjectId: ANY, yearId: ANY });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["examinations", "assessment-structures"] });
    queryClient.invalidateQueries({ queryKey: ["examinations", "assessment-assignments"] });
  };
  const fail = (e: unknown) => toast.error(extractApiErrorMessage(e, t("Could not save")));

  const save = useMutation({
    mutationFn: (f: AssessmentStructureForm) => saveAssessmentStructure(f, editing?.id),
    onSuccess: () => {
      refresh();
      toast.success(editing ? t("Structure updated. Exams already scheduled keep their own copy.") : t("Structure created"));
      setForm(null);
      setEditing(null);
    },
    onError: fail,
  });
  const duplicate = useMutation({ mutationFn: duplicateAssessmentStructure, onSuccess: () => { refresh(); toast.success(t("Copied")); }, onError: fail });
  const archive = useMutation({ mutationFn: archiveAssessmentStructure, onSuccess: () => { refresh(); toast.success(t("Archived")); }, onError: fail });
  const assign = useMutation({
    mutationFn: () =>
      saveAssessmentAssignment({
        structureId: target.structureId,
        classId: target.classId === ANY ? undefined : target.classId,
        subjectId: target.subjectId === ANY ? undefined : target.subjectId,
        academicYearId: target.yearId === ANY ? undefined : target.yearId,
      }),
    onSuccess: () => { refresh(); toast.success(t("Assigned")); },
    onError: fail,
  });
  const unassign = useMutation({ mutationFn: deleteAssessmentAssignment, onSuccess: refresh, onError: fail });

  const open = (s: AssessmentStructure | null) => {
    setEditing(s);
    setForm(s ? { name: s.name, board: s.board ?? "", description: s.description ?? "", components: s.components.map((c) => ({ ...c })) } : { ...EMPTY, components: EMPTY.components.map((c) => ({ ...c })) });
  };
  const problem = form ? (form.name.trim() ? validateComponents(form.components) : "Enter a name.") : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{t("Assessment structures")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Define how marks are collected for a subject (for example PT, NBS, SEA, Half Yearly). Mark entry and progress cards follow these.")}
            </p>
          </div>
          <Button onClick={() => open(null)}>
            <Plus className="w-4 h-4" /> {t("New structure")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {structures.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("No structures yet. Create one, starting from a board template if you like.")}</p>}
          {structures.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {s.name} <Badge variant="neutral">v{s.version}</Badge> {s.board && <Badge variant="info">{s.board}</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {s.components.map((c) => `${c.label} ${c.max}`).join(" · ")} — {t("Total")} {s.totalMax}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label={t("Edit")} onClick={() => open(s)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" aria-label={t("Duplicate")} onClick={() => duplicate.mutate(s.id)}><Copy className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" aria-label={t("Archive")} onClick={() => archive.mutate(s.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Where each structure applies")}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t("The most specific match wins: class and subject, then subject, then class, then the school default. Leave a field as Any to widen it.")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <Select value={target.structureId || undefined} onValueChange={(v) => setTarget({ ...target, structureId: v })}>
              <SelectTrigger aria-label={t("Structure")}><SelectValue placeholder={t("Structure")} /></SelectTrigger>
              <SelectContent>{structures.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={target.classId} onValueChange={(v) => setTarget({ ...target, classId: v })}>
              <SelectTrigger aria-label={t("Class")}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ANY}>{t("Any class")}</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={target.subjectId} onValueChange={(v) => setTarget({ ...target, subjectId: v })}>
              <SelectTrigger aria-label={t("Subject")}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ANY}>{t("Any subject")}</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={target.yearId} onValueChange={(v) => setTarget({ ...target, yearId: v })}>
              <SelectTrigger aria-label={t("Academic year")}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ANY}>{t("Any year")}</SelectItem>{years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button disabled={!target.structureId || assign.isPending} onClick={() => assign.mutate()}>{t("Assign")}</Button>
          </div>
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>
                <strong>{a.structureName}</strong> → {a.className ?? t("Any class")} · {a.subjectName ?? t("Any subject")} · {a.academicYearName ?? t("Any year")}
              </span>
              <Button size="icon" variant="ghost" aria-label={t("Remove assignment")} onClick={() => unassign.mutate(a.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={form !== null} onOpenChange={(v) => { if (!v) { setForm(null); setEditing(null); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("Edit structure") : t("New structure")}</DialogTitle>
            <DialogDescription>{t("Changes apply to exams scheduled from now on. Exams already scheduled keep the structure they were created with.")}</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="as-name">{t("Name")}</Label>
                  <Input id="as-name" value={form.name} maxLength={150} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="as-board" optional>{t("Board")}</Label>
                  <Select value={form.board || undefined} onValueChange={(v) => setForm({ ...form, board: v })}>
                    <SelectTrigger id="as-board"><SelectValue placeholder={t("Select a board")} /></SelectTrigger>
                    <SelectContent>{BOARD_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <ComponentEditor value={form.components} onChange={(components) => setForm({ ...form, components })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(null); setEditing(null); }}>{t("Cancel")}</Button>
            <Button disabled={!form || problem !== null} loading={save.isPending} onClick={() => form && save.mutate(form)}>{t("Save structure")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
