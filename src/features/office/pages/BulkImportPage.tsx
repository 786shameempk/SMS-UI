import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileUp, Trash2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormErrorBanner, Pager } from "../components/kit";
import { ReadinessCard } from "../components/ReadinessCard";
import { listSchools } from "../api/sales";
import {
  confirmImport, discardImport, downloadErrorReport, downloadTemplate, importDetail, importHistory, listImportTemplates, listInvitations, resendInvitation, schoolImportStatus, uploadImport,
  type ImportBatch, type ImportDetail, type Invitation, type ImportRow, type ImportTemplate, type RowFilter,
} from "../api/onboardingImport";
import { dateTime, errorText } from "../helpers";
import { useHasOfficePermission } from "../store";

const MAX_UPLOAD_BYTES = 1024 * 1024;

const ROW_TONE: Record<string, BadgeVariant> = { Ok: "success", Reuse: "info", Error: "danger", Created: "success", Reused: "info", Rejected: "danger" };
const BATCH_TONE: Record<string, BadgeVariant> = { Validated: "warning", Applying: "info", Completed: "success", Discarded: "neutral" };
const FILTERS: { value: RowFilter; label: string }[] = [
  { value: "all", label: "All rows" },
  { value: "errors", label: "Errors" },
  { value: "reuse", label: "Already exist" },
  { value: "ok", label: "Will be created" },
];

export default function BulkImportPage() {
  const [params, setParams] = useSearchParams();
  const schoolId = params.get("school");
  const schools = useQuery({ queryKey: ["office", "import-schools"], queryFn: () => listSchools({ pageSize: 200 }) });
  const provisioned = (schools.data?.items ?? []).filter((s) => s.tenantId);

  return (
    <PageContainer>
      <PageHeader
        icon={UploadCloud}
        title="Bulk import"
        description="Set up a school's academic years, classes and sections from CSV files. Every file is checked first; nothing is written until you confirm."
      />
      <div className="max-w-md">
        <Select value={schoolId ?? ""} onValueChange={(v) => setParams({ school: v })}>
          <SelectTrigger aria-label="School">
            <SelectValue placeholder={schools.isLoading ? "Loading schools…" : "Choose a school"} />
          </SelectTrigger>
          <SelectContent>
            {provisioned.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.schoolName} ({s.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {schools.data && provisioned.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No school has been provisioned yet. A school needs its account before it can be imported into.</p>}
      </div>
      {schoolId ? <SchoolImport key={schoolId} schoolId={schoolId} /> : <EmptyState title="Choose a school" description="Pick the school to set up." />}
    </PageContainer>
  );
}

function SchoolImport({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const canUpload = useHasOfficePermission("onboarding.import.upload");
  const canSeePeople = useHasOfficePermission("onboarding.users.view");
  const canSeeStatus = useHasOfficePermission("onboarding.view");
  const [activeId, setActiveId] = useState<string | null>(null);
  const status = useQuery({ queryKey: ["office", "import-status", schoolId], queryFn: () => schoolImportStatus(schoolId) });
  const templates = useQuery({ queryKey: ["office", "import-templates"], queryFn: listImportTemplates });
  const history = useQuery({ queryKey: ["office", "import-history", schoolId], queryFn: () => importHistory(schoolId) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["office"] });

  if (status.isLoading) return <Skeleton className="h-40 w-full" />;
  if (status.isError) return <ErrorState description={errorText(status.error)} onRetry={() => void status.refetch()} />;
  const s = status.data!;
  if (!s.provisioned) return <EmptyState title="Not provisioned yet" description={s.problem ?? "This school has no account yet."} />;

  return (
    <div className="space-y-6">
      {s.problem && <FormErrorBanner message={s.problem} />}
      {s.existing && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Academic years" value={s.existing.academicYears} tone="brand" />
          <StatCard label="Classes" value={s.existing.classes} tone="info" />
          <StatCard label="Sections" value={s.existing.sections} tone="info" />
          <StatCard label="Staff" value={s.existing.staff} tone="success" />
          <StatCard label="Students" value={s.existing.students} tone="success" />
        </div>
      )}

      {canSeeStatus && <ReadinessCard schoolId={schoolId} />}

      <section aria-labelledby="steps" className="space-y-3">
        <h2 id="steps" className="text-base font-semibold">Import in this order</h2>
        {templates.isLoading && <Skeleton className="h-32 w-full" />}
        {(templates.data ?? []).map((t) => (
          <TemplateCard key={t.type} template={t} schoolId={schoolId} canUpload={canUpload} onUploaded={(d) => { setActiveId(d.batch.id); void refresh(); }} />
        ))}
      </section>

      {activeId && <BatchReview key={activeId} batchId={activeId} onChanged={() => void refresh()} onClose={() => setActiveId(null)} />}

      {canSeePeople && <PeopleDirectory schoolId={schoolId} />}

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="text-base font-semibold">Upload history</h2>
        {history.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing has been uploaded for this school yet.</p>}
        {!!history.data?.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.data.map((b: ImportBatch) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.fileName}
                    <div className="text-xs text-muted-foreground">{b.type}</div>
                  </TableCell>
                  <TableCell><Badge variant={BATCH_TONE[b.status]}>{b.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{b.totalRows}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.createdCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.rejectedCount}</TableCell>
                  <TableCell>
                    {dateTime(b.uploadedAt)}
                    <div className="text-xs text-muted-foreground">{b.uploadedByEmail}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setActiveId(b.id)}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function TemplateCard({ template, schoolId, canUpload, onUploaded }: { template: ImportTemplate; schoolId: string; canUpload: boolean; onUploaded: (d: ImportDetail) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (file: File) => uploadImport(schoolId, template.type, file),
    onSuccess: (d) => { setError(null); onUploaded(d); },
    onError: (e) => setError(errorText(e)),
  });
  const template$ = useMutation({ mutationFn: () => downloadTemplate(template.type), onError: (e) => toast.error(errorText(e)) });

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) { setError("The file is larger than 1 MB."); return; }
    upload.mutate(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.order}. {template.label}</CardTitle>
        <CardDescription>
          {template.description}
          {template.dependsOn.length > 0 && ` Needs ${template.dependsOn.join(", ")} first.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {template.columns.map((c) => (
            <span key={c.name} title={`${c.description} Example: ${c.example}`} className="rounded border px-2 py-1">
              <code>{c.name}</code>{c.required ? " *" : ""}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => template$.mutate()} loading={template$.isPending}>
            <Download className="h-4 w-4" aria-hidden="true" />Download template
          </Button>
          {canUpload && (
            <>
              <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label={`${template.label} CSV file`} onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
              <Button onClick={() => input.current?.click()} loading={upload.isPending}>
                <FileUp className="h-4 w-4" aria-hidden="true" />Upload and check
              </Button>
            </>
          )}
        </div>
        <FormErrorBanner message={error} />
      </CardContent>
    </Card>
  );
}

function BatchReview({ batchId, onChanged, onClose }: { batchId: string; onChanged: () => void; onClose: () => void }) {
  const canConfirm = useHasOfficePermission("onboarding.import.confirm");
  const canUpload = useHasOfficePermission("onboarding.import.upload");
  const qc = useQueryClient();
  const [filter, setFilter] = useState<RowFilter>("all");
  const [page, setPage] = useState(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detail = useQuery({ queryKey: ["office", "import-detail", batchId, filter, page], queryFn: () => importDetail(batchId, { filter, page, pageSize: 25 }), placeholderData: (prev) => prev });
  const done = () => { void qc.invalidateQueries({ queryKey: ["office", "import-detail", batchId] }); onChanged(); };
  const confirm = useMutation({
    mutationFn: () => confirmImport(batchId, acknowledged),
    onSuccess: (d) => { setError(null); toast.success(`Imported: ${d.batch.createdCount} created, ${d.batch.reusedCount} already existed, ${d.batch.rejectedCount} rejected.`); done(); },
    onError: (e) => { setError(errorText(e)); done(); },
  });
  const discard = useMutation({ mutationFn: () => discardImport(batchId), onSuccess: () => { toast.success("Upload set aside."); done(); }, onError: (e) => setError(errorText(e)) });
  const report = useMutation({ mutationFn: () => downloadErrorReport(batchId, detail.data!.batch.type), onError: (e) => toast.error(errorText(e)) });

  if (detail.isLoading) return <Skeleton className="h-40 w-full" />;
  if (detail.isError) return <ErrorState description={errorText(detail.error)} onRetry={() => void detail.refetch()} />;
  const { batch, rows } = detail.data!;
  const open = batch.status === "Validated" || batch.status === "Applying";
  const finished = batch.status === "Completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {batch.fileName} <Badge variant={BATCH_TONE[batch.status]}>{batch.status}</Badge>
        </CardTitle>
        <CardDescription>{batch.type} · uploaded {dateTime(batch.uploadedAt)} by {batch.uploadedByEmail}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Rows" value={batch.totalRows} tone="neutral" />
          <StatCard label={finished ? "Created" : "Will be created"} value={finished ? batch.createdCount : batch.validRows} tone="success" />
          <StatCard label={finished ? "Already existed" : "Already exist"} value={finished ? batch.reusedCount : batch.reusedRows} tone="info" />
          <StatCard label={finished ? "Rejected" : "With errors"} value={finished ? batch.rejectedCount : batch.errorRows} tone={(finished ? batch.rejectedCount : batch.errorRows) > 0 ? "danger" : "neutral"} />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Show rows">
          {FILTERS.map((f) => (
            <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} onClick={() => { setFilter(f.value); setPage(1); }}>{f.label}</Button>
          ))}
        </div>

        <RowTable rows={rows.items} />
        <Pager page={rows.pageNumber} totalPages={rows.totalPages} totalCount={rows.totalCount} onPage={setPage} noun="row" />

        <FormErrorBanner message={error} />
        {open && canConfirm && batch.errorRows > 0 && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />
            <span>{batch.errorRows} row(s) have errors and will <strong>not</strong> be imported. Import the other rows anyway.</span>
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          {open && canConfirm && (
            <Button onClick={() => confirm.mutate()} loading={confirm.isPending} disabled={batch.errorRows > 0 && !acknowledged}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />{batch.status === "Applying" ? "Resume import" : "Confirm import"}
            </Button>
          )}
          {batch.status === "Validated" && canUpload && (
            <Button variant="outline" onClick={() => discard.mutate()} loading={discard.isPending}><Trash2 className="h-4 w-4" aria-hidden="true" />Set aside</Button>
          )}
          {(batch.errorRows > 0 || batch.rejectedCount > 0) && (
            <Button variant="outline" onClick={() => report.mutate()} loading={report.isPending}><Download className="h-4 w-4" aria-hidden="true" />Download error report</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RowTable({ rows }: { rows: ImportRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No rows match.</p>;
  const columns = Object.keys(rows[0].data);
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line</TableHead>
            <TableHead>Result</TableHead>
            {columns.map((c) => <TableHead key={c}>{c}</TableHead>)}
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.line}>
              <TableCell className="tabular-nums">{r.line}</TableCell>
              <TableCell><Badge variant={ROW_TONE[r.outcome ?? r.status]}>{r.outcome ?? r.status}</Badge></TableCell>
              {columns.map((c) => <TableCell key={c}>{r.data[c]}</TableCell>)}
              <TableCell className="min-w-48 text-sm">{r.messages.map((m, i) => <div key={i}>{m}</div>)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const ACCOUNT_TONE: Record<string, BadgeVariant> = { Active: "success", InvitationSent: "info", InvitationFailed: "danger", Suspended: "warning", Missing: "danger" };
const ACCOUNT_LABEL: Record<string, string> = { Active: "Active", InvitationSent: "Invited", InvitationFailed: "Email failed", Suspended: "Suspended", Missing: "Missing" };

function PeopleDirectory({ schoolId }: { schoolId: string }) {
  const canResend = useHasOfficePermission("onboarding.import.confirm");
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const people = useQuery({ queryKey: ["office", "import-people", schoolId, status, page], queryFn: () => listInvitations(schoolId, { status, page, pageSize: 25 }), placeholderData: (prev) => prev });
  const resend = useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: () => { toast.success("Invitation sent."); void qc.invalidateQueries({ queryKey: ["office", "import-people"] }); },
    onError: (e) => toast.error(errorText(e)),
  });
  const totals = people.data?.totals ?? {};

  return (
    <section aria-labelledby="people" className="space-y-3">
      <h2 id="people" className="text-base font-semibold">People and invitations</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Account status">
        {["all", "InvitationSent", "InvitationFailed", "Active", "Suspended"].map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => { setStatus(s); setPage(1); }}>
            {s === "all" ? "Everyone" : ACCOUNT_LABEL[s]}{s !== "all" && totals[s] ? ` (${totals[s]})` : ""}
          </Button>
        ))}
      </div>
      {people.isError && <ErrorState description={errorText(people.error)} onRetry={() => void people.refetch()} />}
      {people.data && people.data.page.items.length === 0 && <p className="text-sm text-muted-foreground">No logins have been made by an import yet.</p>}
      {!!people.data?.page.items.length && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Last invitation</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.data.page.items.map((p: Invitation) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.name}
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">{p.role}</TableCell>
                  <TableCell>
                    <Badge variant={ACCOUNT_TONE[p.accountStatus]}>{ACCOUNT_LABEL[p.accountStatus]}</Badge>
                    {p.lastError && <div className="text-xs text-destructive">{p.lastError}</div>}
                  </TableCell>
                  <TableCell>{p.lastSentAt ? dateTime(p.lastSentAt) : "—"}{p.sendCount > 1 ? ` · sent ${p.sendCount}×` : ""}</TableCell>
                  <TableCell className="text-right">
                    {canResend && (p.accountStatus === "InvitationSent" || p.accountStatus === "InvitationFailed") && (
                      <Button variant="outline" size="sm" onClick={() => resend.mutate(p.id)} loading={resend.isPending && resend.variables === p.id}>Resend</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={people.data.page.pageNumber} totalPages={people.data.page.totalPages} totalCount={people.data.page.totalCount} onPage={setPage} noun="person" />
        </>
      )}
    </section>
  );
}
