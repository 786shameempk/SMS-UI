import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Download, Eye, FileArchive, FileX2, Printer, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listExams } from "@/features/examinations/api";
import { changeIssueStatus, downloadExport, downloadIssuePdf, getIssue, listAudit, listIssues } from "./api";
import { CardRenderer } from "./CardRenderer";
import { printCards } from "./printCards";
import { useProgressCardAccess } from "./access";
import type { IssueDetail, IssueSummary } from "./types";

const VARIANT = { Draft: "neutral", Approved: "info", Published: "success" } as const;

export default function IssuesTab() {
  const { t } = useTranslation("progress-cards");
  const queryClient = useQueryClient();
  const access = useProgressCardAccess();
  const { data: exams = [] } = useQuery({ queryKey: ["examinations", "exams"], queryFn: listExams });
  const [examId, setExamId] = useState("");
  const [status, setStatus] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<IssueDetail | null>(null);

  const issues = useQuery({ queryKey: ["progress-cards", "issues", examId, status], queryFn: () => listIssues({ examId: examId || undefined, status: status || undefined }) });
  const audit = useQuery({ queryKey: ["progress-cards", "audit"], queryFn: listAudit });

  const change = useMutation({
    mutationFn: (action: "approve" | "publish" | "unpublish") => changeIssueStatus([...picked], action),
    onSuccess: (r, action) => {
      toast.success(action === "approve" ? t("{{count}} approved", { count: r.changed }) : action === "publish" ? t("{{count}} published to parents and students", { count: r.changed }) : t("{{count}} unpublished", { count: r.changed }));
      setPicked(new Set());
      queryClient.invalidateQueries({ queryKey: ["progress-cards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const file = useMutation({ mutationFn: (mode: "pdf" | "zip") => downloadExport([...picked], mode), onError: (e: Error) => toast.error(e.message) });
  const one = useMutation({ mutationFn: (r: IssueSummary) => downloadIssuePdf(r.id, `${r.studentName}-${r.examName}`.replace(/[^\w-]+/g, "-")), onError: (e: Error) => toast.error(e.message) });

  const view = async (row: IssueSummary) => setOpen(await getIssue(row.id).catch((e: Error) => { toast.error(e.message); return null; }));
  const printSelected = async () => {
    const details = await Promise.all([...picked].map((id) => getIssue(id)));
    if (details.length === 0) return;
    if (!printCards(details[0].config, details.map((d) => d.data), t("Progress cards"))) toast.error(t("Allow pop-ups to print."));
  };

  const rows = issues.data ?? [];
  const toggle = (id: string, on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{t("Generated and published cards")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-64 shrink-0"><NativeSelect className="w-full" value={examId} onChange={(e) => setExamId(e.target.value)} aria-label={t("Examination")}><option value="">{t("All exams")}</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</NativeSelect></div>
            <div className="w-48 shrink-0"><NativeSelect className="w-full" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("Status")}><option value="">{t("Any status")}</option><option value="Draft">{t("Draft")}</option><option value="Approved">{t("Approved")}</option><option value="Published">{t("Published")}</option></NativeSelect></div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={picked.size === 0 || !access.canApprove} onClick={() => change.mutate("approve")}><CheckCheck className="h-4 w-4" /> {t("Approve")}</Button>
              <Button size="sm" disabled={picked.size === 0 || !access.canApprove} onClick={() => change.mutate("publish")}><Send className="h-4 w-4" /> {t("Publish")}</Button>
              <Button size="sm" variant="outline" disabled={picked.size === 0 || !access.canApprove} onClick={() => change.mutate("unpublish")}><FileX2 className="h-4 w-4" /> {t("Unpublish")}</Button>
              <Button size="sm" variant="outline" disabled={picked.size === 0} loading={file.isPending && file.variables === "pdf"} onClick={() => file.mutate("pdf")}><Download className="h-4 w-4" /> {t("Bulk PDF")}</Button>
              <Button size="sm" variant="outline" disabled={picked.size === 0} loading={file.isPending && file.variables === "zip"} onClick={() => file.mutate("zip")}><FileArchive className="h-4 w-4" /> {t("ZIP of PDFs")}</Button>
              <Button size="sm" variant="outline" disabled={picked.size === 0} onClick={printSelected}><Printer className="h-4 w-4" /> {t("Print")}</Button>
            </div>
          </div>
          {issues.isLoading ? <LoadingState /> : issues.error ? <ErrorState /> : rows.length === 0 ? (
            <EmptyState title={t("No cards yet")} description={t("Generate cards from the Generate tab. They start as drafts.")} />
          ) : (
            <Table containerClassName="rounded-lg border border-border">
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="w-8"><input type="checkbox" aria-label={t("Select all")} checked={picked.size === rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></TableHead>
                  <TableHead>{t("Student")}</TableHead><TableHead>{t("Class")}</TableHead><TableHead>{t("Exam")}</TableHead><TableHead>{t("Template")}</TableHead><TableHead>{t("Status")}</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><input type="checkbox" aria-label={r.studentName} checked={picked.has(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} /></TableCell>
                    <TableCell className="min-w-[10rem]">{r.studentName} <span className="text-xs text-muted-foreground">({r.admissionNumber})</span></TableCell>
                    <TableCell className="whitespace-nowrap">{r.className}</TableCell><TableCell className="min-w-[12rem]">{r.examName}</TableCell>
                    <TableCell>{r.templateName} v{r.templateVersion}</TableCell>
                    <TableCell><Badge variant={VARIANT[r.status]}>{t(r.status)}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-end">
                      <Button variant="ghost" size="icon-sm" aria-label={t("View card")} onClick={() => view(r)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label={t("Download PDF")} onClick={() => one.mutate(r)}><Download className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {open && (
        <Card>
          <CardHeader><CardTitle>{open.data.studentName} · {open.data.examName}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-2"><Button size="sm" variant="outline" onClick={() => setOpen(null)}>{t("Close")}</Button></div>
            <div className="overflow-auto rounded-xl border border-border bg-muted/40 p-4" style={{ maxHeight: "75vh" }}>
              <div style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "fit-content" }}><CardRenderer config={open.config} data={open.data} /></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t("Activity log")}</CardTitle></CardHeader>
        <CardContent>
          {(audit.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{t("Nothing yet.")}</p> : (
            <ul className="space-y-1 text-sm">
              {(audit.data ?? []).slice(0, 30).map((a, i) => (
                <li key={i} className="flex justify-between gap-3"><span><b className="capitalize">{a.subject}</b> {a.action}{a.detail ? ` · ${a.detail}` : ""}</span><span className="shrink-0 text-muted-foreground">{new Date(a.at).toLocaleString()}</span></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
