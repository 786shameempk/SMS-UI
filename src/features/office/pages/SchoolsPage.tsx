import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DownloadCloud, Plus, School } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormErrorBanner, Pager } from "../components/kit";
import { AdoptDialog } from "../components/AdoptDialog";
import { Field, StatusBadge } from "../components/salesKit";
import { createSchool, listSchools, unmanagedTenants } from "../api/sales";
import { day, errorText, useDebounced } from "../helpers";
import { useHasOfficePermission } from "../store";
import { ONBOARDING_STAGES } from "../onboarding";
import type { SchoolRequest } from "../salesTypes";

const blank: SchoolRequest = {
  schoolName: "", code: "", subdomain: "", schoolType: null, board: null, country: "India", state: null, city: null, address: null, contactName: null, contactEmail: null,
  contactPhone: null, billingContactName: null, billingContactEmail: null, taxId: null, expectedStudents: null, branches: 1, internalNotes: null,
};

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export default function SchoolsPage() {
  const canManage = useHasOfficePermission("schools.manage");
  const canControl = useHasOfficePermission("tenants.control");
  const [adopting, setAdopting] = useState(false);
  const unmanaged = useQuery({ queryKey: ["office", "unmanaged-tenants"], queryFn: unmanagedTenants, enabled: canControl });
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const q = useDebounced(search);
  const schools = useQuery({
    queryKey: ["office", "schools", q, stage, status, page],
    queryFn: () => listSchools({ search: q, stage: stage === "all" ? undefined : Number(stage), status, page, pageSize: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <PageContainer>
      <PageHeader
        icon={School}
        title="Schools"
        description="Every school from first enquiry to an active subscription."
        actions={
          <div className="flex flex-wrap gap-2">
            {canControl && (
              <Button variant="outline" onClick={() => setAdopting(true)}>
                <DownloadCloud className="h-4 w-4" aria-hidden="true" />
                Adopt existing school
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add school
              </Button>
            )}
          </div>
        }
      />
      {canControl && (unmanaged.data?.length ?? 0) > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
          <span>{unmanaged.data!.length} school{unmanaged.data!.length === 1 ? " is" : "s are"} not managed by the office ({unmanaged.data!.slice(0, 3).map((t) => t.schoolName).join(", ")}{unmanaged.data!.length > 3 ? "…" : ""}).</span>
          <Button size="sm" variant="outline" onClick={() => setAdopting(true)}>Adopt</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search schools" placeholder="Search name, code or city" className="w-64" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select value={stage} onValueChange={(v) => { setStage(v); setPage(1); }}>
          <SelectTrigger className="w-52" aria-label="Filter by stage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {ONBOARDING_STAGES.map((s, i) => (
              <SelectItem key={s} value={String(i + 1)}>{`${i + 1}. ${s}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {schools.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : schools.isError ? (
        <ErrorState onRetry={() => schools.refetch()} retrying={schools.isRefetching} />
      ) : schools.data!.items.length === 0 ? (
        <EmptyState icon={School} title="No schools match" description="Add a school, or change the search." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="text-right">Open tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.data!.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link className="font-medium text-primary hover:underline" to={`/office/schools/${s.id}`}>{s.schoolName}</Link>
                      <p className="text-xs text-muted-foreground">{[s.code, s.city, s.state].filter(Boolean).join(" · ")}</p>
                    </TableCell>
                    <TableCell>
                      <p>{`${s.stageNumber}. ${s.stage}`}</p>
                      <div className="mt-0.5 flex gap-1">
                        {s.status !== "Open" && <StatusBadge status={s.status} />}
                        {s.blocker && <StatusBadge status="Blocked" />}
                      </div>
                    </TableCell>
                    <TableCell>{s.ownerName ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell>
                      {s.subscriptionStatus ? (
                        <>
                          <StatusBadge status={s.subscriptionStatus} />
                          <p className="mt-0.5 text-xs text-muted-foreground">{s.planName} · ends {day(s.subscriptionEnds)}</p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.openTasks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pager page={schools.data!.pageNumber} totalPages={schools.data!.totalPages} totalCount={schools.data!.totalCount} onPage={setPage} noun="school" />
        </>
      )}
      {adopting && <AdoptDialog onClose={() => setAdopting(false)} />}
      {adding && <AddSchoolDialog onClose={() => setAdding(false)} />}
    </PageContainer>
  );
}

function AddSchoolDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<SchoolRequest>(blank);
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof SchoolRequest>(key: K, value: SchoolRequest[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: keyof SchoolRequest) => (e: React.ChangeEvent<HTMLInputElement>) => set(key, (e.target.value || null) as never);

  const save = useMutation({
    mutationFn: () => createSchool(form),
    onSuccess: (school) => {
      toast.success("School added.");
      navigate(`/office/schools/${school.id}`);
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a school</DialogTitle>
          <DialogDescription>Starts at the Lead stage. The school gets its own login only after a payment is verified.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="School name *">
            <Input
              value={form.schoolName}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, schoolName: name, subdomain: subdomainTouched ? f.subdomain : slug(name), code: f.code || slug(name).toUpperCase().slice(0, 12) }));
              }}
            />
          </Field>
          <Field label="School code *"><Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} /></Field>
          <Field label="Subdomain *">
            <Input value={form.subdomain} onChange={(e) => { setSubdomainTouched(true); set("subdomain", slug(e.target.value)); }} />
          </Field>
          <Field label="Board"><Input value={form.board ?? ""} onChange={text("board")} placeholder="CBSE, ICSE, State…" /></Field>
          <Field label="City"><Input value={form.city ?? ""} onChange={text("city")} /></Field>
          <Field label="State"><Input value={form.state ?? ""} onChange={text("state")} /></Field>
          <Field label="Contact person"><Input value={form.contactName ?? ""} onChange={text("contactName")} /></Field>
          <Field label="Contact email"><Input type="email" value={form.contactEmail ?? ""} onChange={text("contactEmail")} /></Field>
          <Field label="Contact phone"><Input value={form.contactPhone ?? ""} onChange={text("contactPhone")} /></Field>
          <Field label="Tax ID (GSTIN)"><Input value={form.taxId ?? ""} onChange={text("taxId")} /></Field>
          <Field label="Expected students">
            <Input type="number" min={0} value={form.expectedStudents ?? ""} onChange={(e) => set("expectedStudents", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Branches"><Input type="number" min={1} value={form.branches} onChange={(e) => set("branches", Math.max(1, Number(e.target.value) || 1))} /></Field>
        </div>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => { setError(null); save.mutate(); }} loading={save.isPending} disabled={!form.schoolName.trim() || !form.code.trim() || !form.subdomain.trim()}>Add school</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
