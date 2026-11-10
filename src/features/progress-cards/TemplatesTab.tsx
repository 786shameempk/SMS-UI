import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listClasses } from "@/features/academics/api";
import { copySystemTemplate, deleteAssignment, listAssignments, listSchemes, listTemplates, saveAssignment, setTemplateStatus } from "./api";
import type { TemplateSummary } from "./types";

const EXAM_TYPES = ["Internal", "Midterm", "Final", "Practical", "Viva"];

export default function TemplatesTab() {
  const { t } = useTranslation("progress-cards");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const templates = useQuery({ queryKey: ["progress-cards", "templates"], queryFn: listTemplates });
  const assignments = useQuery({ queryKey: ["progress-cards", "assignments"], queryFn: listAssignments });
  const { data: schemes = [] } = useQuery({ queryKey: ["progress-cards", "schemes"], queryFn: listSchemes });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const [board, setBoard] = useState("");
  const [form, setForm] = useState({ templateId: "", schemeId: "", classId: "", examType: "", isDefault: false });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["progress-cards"] });
  const onError = (e: Error) => toast.error(e.message);

  const copy = useMutation({
    mutationFn: (key: string) => copySystemTemplate(key),
    onSuccess: (d) => { refresh(); toast.success(t("Copied to your school")); navigate(`/progress-cards/templates/${d.summary.id}`); },
    onError,
  });
  const status = useMutation({ mutationFn: (v: { id: string; status: "Active" | "Inactive" | "Archived" }) => setTemplateStatus(v.id, v.status), onSuccess: () => { refresh(); toast.success(t("Updated")); }, onError });
  const assign = useMutation({
    mutationFn: () => saveAssignment({ templateId: form.templateId, gradingSchemeId: form.schemeId || null, classId: form.classId || null, examType: form.examType || null, isDefault: form.isDefault }),
    onSuccess: () => { refresh(); toast.success(t("Assignment saved")); },
    onError,
  });
  const unassign = useMutation({ mutationFn: (id: string) => deleteAssignment(id), onSuccess: () => { refresh(); toast.success(t("Removed")); }, onError });

  if (templates.isLoading) return <LoadingState />;
  if (templates.error) return <ErrorState />;

  const all = (templates.data ?? []).filter((x) => x.status !== "Archived" && (!board || x.board === board));
  const boards = [...new Set((templates.data ?? []).map((x) => x.board))];
  const mine = (templates.data ?? []).filter((x) => x.type === "School" && x.status === "Active");
  const range = (x: TemplateSummary) => (x.classFrom ? `${x.classFrom}${x.classTo && x.classTo !== x.classFrom ? `-${x.classTo}` : ""}` : t("Any"));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{t("Template library")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-52 shrink-0"><NativeSelect className="w-full" value={board} onChange={(e) => setBoard(e.target.value)} aria-label={t("Board")}><option value="">{t("All boards")}</option>{boards.map((b) => <option key={b}>{b}</option>)}</NativeSelect></div>
            <Button asChild size="sm"><Link to="/progress-cards/templates/new"><Plus className="h-4 w-4" /> {t("Create template")}</Link></Button>
            <p className="text-xs text-muted-foreground">{t("Built-in templates are read-only. Copy one to your school to customise it.")}</p>
          </div>
          {all.length === 0 ? <EmptyState title={t("No templates")} /> : (
            <Table containerClassName="rounded-lg border border-border">
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>{t("Name")}</TableHead><TableHead>{t("Board")}</TableHead><TableHead>{t("Category")}</TableHead><TableHead>{t("Classes")}</TableHead><TableHead>{t("Type")}</TableHead><TableHead>{t("Status")}</TableHead><TableHead>{t("Updated")}</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((x) => (
                  <TableRow key={x.id ?? x.systemKey}>
                    <TableCell className="min-w-[14rem] font-medium">{x.name}{x.isAssigned && <Badge variant="info" className="ms-2">{t("Assigned")}</Badge>}</TableCell>
                    <TableCell className="whitespace-nowrap">{x.board}</TableCell><TableCell>{x.category ?? "-"}</TableCell><TableCell className="whitespace-nowrap">{range(x)}</TableCell>
                    <TableCell><Badge variant={x.type === "System" ? "neutral" : "brand"}>{x.type === "System" ? t("Built-in") : t("School")}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap">{t(x.status)}</TableCell>
                    <TableCell className="whitespace-nowrap">{x.updatedAt ? new Date(x.updatedAt).toLocaleDateString() : x.guidelineYear ? `${t("Pattern")} ${x.guidelineYear}` : "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-end">
                      {x.type === "System" ? (
                        <>
                          <Button asChild variant="ghost" size="icon-sm" aria-label={t("Preview")}><Link to={`/progress-cards/templates/system/${x.systemKey}`}><Eye className="h-4 w-4" /></Link></Button>
                          <Button variant="ghost" size="icon-sm" aria-label={t("Copy to my school")} onClick={() => copy.mutate(x.systemKey as string)}><Copy className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Button asChild variant="ghost" size="icon-sm" aria-label={t("Edit")}><Link to={`/progress-cards/templates/${x.id}`}><Pencil className="h-4 w-4" /></Link></Button>
                          <Button variant="ghost" size="sm" onClick={() => status.mutate({ id: x.id as string, status: x.status === "Active" ? "Inactive" : "Active" })}>{x.status === "Active" ? t("Deactivate") : t("Activate")}</Button>
                          <Button variant="ghost" size="icon-sm" aria-label={t("Archive")} onClick={() => status.mutate({ id: x.id as string, status: "Archived" })}><Archive className="h-4 w-4" /></Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("Which template each class uses")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("The generator picks the most specific match: class and exam type, then class, then exam type, then the school default.")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5"><Label>{t("Template")}</Label><NativeSelect className="w-full" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}><option value="">{t("Select")}</option>{mine.map((x) => <option key={x.id} value={x.id ?? ""}>{x.name}</option>)}</NativeSelect></div>
            <div className="space-y-1.5"><Label>{t("Grading scheme")}</Label><NativeSelect className="w-full" value={form.schemeId} onChange={(e) => setForm({ ...form, schemeId: e.target.value })}><option value="">{t("None")}</option>{schemes.filter((s) => s.type === "School").map((s) => <option key={s.id} value={s.id ?? ""}>{s.name}</option>)}</NativeSelect></div>
            <div className="space-y-1.5"><Label>{t("Class")}</Label><NativeSelect className="w-full" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}><option value="">{t("Any class")}</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></div>
            <div className="space-y-1.5"><Label>{t("Exam type")}</Label><NativeSelect className="w-full" value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })}><option value="">{t("Any type")}</option>{EXAM_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</NativeSelect></div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> {t("School default")}</label>
              <Button onClick={() => assign.mutate()} disabled={!form.templateId} loading={assign.isPending}>{t("Assign")}</Button>
            </div>
          </div>
          {(assignments.data ?? []).length > 0 && (
            <Table containerClassName="rounded-lg border border-border">
              <TableHeader><TableRow hover={false}><TableHead>{t("Applies to")}</TableHead><TableHead>{t("Template")}</TableHead><TableHead>{t("Grading scheme")}</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {(assignments.data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.isDefault ? t("School default") : [a.className ?? t("Any class"), a.examType ?? t("any exam type")].join(" · ")}</TableCell>
                    <TableCell>{a.templateName}</TableCell><TableCell>{a.schemeName ?? "-"}</TableCell>
                    <TableCell className="text-end"><Button variant="ghost" size="icon-sm" aria-label={t("Remove")} onClick={() => unassign.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
