import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, PackageOpen, Plus, Undo2, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { bulkIssue, cancelIssue, createIssue, decideIssue, fulfilIssue, listIssues } from "../api";
import FormDialog from "../components/FormDialog";
import RecipientPicker, { emptyRecipient, useRecipientOptions, type Recipient } from "../components/RecipientPicker";
import { ISSUE_STATUS_LABEL, RECIPIENT_LABEL } from "../constants";
import { Field, LinesEditor, PagedTable, PrintableDialog, SelectField, StoreSelect, SummaryGrid, formatDate, newLine, optional, options, qty, toNumber, todayIso, useApiMutation, useStoreAccess, usePageState, type EditableLine } from "../shared";
import type { Issue, IssueStatus, RecipientType } from "../types";

function IssueForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [storeId, setStoreId] = useState<string | undefined>();
  const [recipient, setRecipient] = useState<Recipient>(emptyRecipient());
  const [purpose, setPurpose] = useState("");
  const [returnable, setReturnable] = useState(false);
  const [returnBy, setReturnBy] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [seeded, setSeeded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (open !== seeded) { setSeeded(open); if (open) { setStoreId(undefined); setRecipient(emptyRecipient()); setPurpose(""); setReturnable(false); setReturnBy(""); setLines([newLine()]); setErrors({}); } }

  const save = useApiMutation(
    (requestOnly: boolean) => createIssue({ storeId: storeId!, recipientType: recipient.type, recipientId: recipient.id, recipientName: recipient.name, recipientDetail: recipient.detail, purpose: optional(purpose), isReturnable: returnable, expectedReturnDate: returnable ? optional(returnBy) : null, requestOnly, lines: lines.map((l) => ({ itemId: l.itemId, quantity: toNumber(l.quantity) })) }),
    { success: (i) => (i.status === "Issued" ? "Items issued" : "Request sent for approval"), invalidate: [["store"]], onSuccess: () => onOpenChange(false) },
  );
  const run = (requestOnly: boolean) => {
    const next: Record<string, string> = {};
    if (!storeId) next.store = t("Choose the store the items come from");
    if (!recipient.name.trim()) next.recipient = t("Choose who the items are for");
    if (lines.some((l) => !l.itemId || toNumber(l.quantity) <= 0)) next.lines = t("Every line needs an item and a quantity above zero");
    else if (new Set(lines.map((l) => l.itemId)).size !== lines.length) next.lines = t("An item appears more than once");
    if (returnable && !returnBy) next.returnBy = t("Say when the items are due back");
    else if (returnable && returnBy < todayIso()) next.returnBy = t("The return date is in the past");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(requestOnly);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={access.issue ? t("Issue items") : t("Request items")}
      description={access.issue ? t("Stock leaves the store as soon as you issue, unless the school requires approval first.") : t("Your request goes to an approver. Stock leaves the store when it is approved and handed over.")}
      submitLabel={access.issue ? t("Issue now") : t("Send request")}
      submitting={save.isPending}
      onSubmit={() => run(!access.issue)}
      size="xl"
      extraActions={access.issue ? <Button type="button" variant="secondary" disabled={save.isPending} onClick={() => run(true)}>{t("Send as a request instead")}</Button> : undefined}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t("From store")} required error={errors.store}><StoreSelect value={storeId} onChange={setStoreId} /></FormField>
        <FormField label={t("Purpose")} htmlFor="iss-purpose" optional><Input id="iss-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={t("Practical class, annual day...")} /></FormField>
      </div>
      <RecipientPicker value={recipient} onChange={setRecipient} />
      {errors.recipient && <p role="alert" className="text-xs text-destructive-strong">{errors.recipient}</p>}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2"><Switch id="iss-returnable" checked={returnable} onCheckedChange={setReturnable} /><label htmlFor="iss-returnable" className="text-sm">{t("Returnable (must come back)")}</label></div>
        {returnable && <FormField label={t("Due back by")} htmlFor="iss-return" required error={errors.returnBy}><Input id="iss-return" type="date" min={todayIso()} value={returnBy} onChange={(e) => setReturnBy(e.target.value)} /></FormField>}
      </div>
      <LinesEditor lines={lines} onChange={setLines} storeId={storeId} showStock />
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}
    </FormDialog>
  );
}

function BulkIssueForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation("store");
  const [storeId, setStoreId] = useState<string | undefined>();
  const [type, setType] = useState<RecipientType>("Student");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [purpose, setPurpose] = useState("");
  const [returnable, setReturnable] = useState(false);
  const [returnBy, setReturnBy] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [seeded, setSeeded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (open !== seeded) { setSeeded(open); if (open) { setStoreId(undefined); setType("Student"); setSearch(""); setPicked([]); setPurpose(""); setReturnable(false); setReturnBy(""); setLines([newLine()]); setErrors({}); } }
  const { options: people, detail } = useRecipientOptions(type, open);
  const shown = people.filter((p) => !search.trim() || `${p.label} ${p.hint ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = useApiMutation(
    () => bulkIssue({ storeId: storeId!, recipientType: type, purpose: optional(purpose), isReturnable: returnable, expectedReturnDate: returnable ? optional(returnBy) : null,
      recipients: picked.map((id) => ({ recipientId: id, recipientName: people.find((p) => p.value === id)?.label ?? "", recipientDetail: detail[id] ?? null })), lines: lines.map((l) => ({ itemId: l.itemId, quantity: toNumber(l.quantity) })) }),
    { success: (r) => `Issued to ${r.length} recipients`, invalidate: [["store"]], onSuccess: () => onOpenChange(false) },
  );
  const submit = () => {
    const next: Record<string, string> = {};
    if (!storeId) next.store = t("Choose the store");
    if (picked.length === 0) next.recipients = t("Choose at least one recipient");
    if (lines.some((l) => !l.itemId || toNumber(l.quantity) <= 0)) next.lines = t("Every line needs an item and a quantity above zero");
    else if (new Set(lines.map((l) => l.itemId)).size !== lines.length) next.lines = t("An item appears more than once");
    if (returnable && !returnBy) next.returnBy = t("Say when the items are due back");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t("Bulk issue")} description={t("Give the same items to many people at once. Each gets their own issue record; if stock runs short, nothing is issued.")} submitLabel={t("Issue to {{count}} recipients", { count: picked.length })} submitting={save.isPending} onSubmit={submit} size="xl">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField label={t("From store")} required error={errors.store}><StoreSelect value={storeId} onChange={setStoreId} /></FormField>
        <FormField label={t("Recipients are")}><SelectField value={type} onChange={(v) => { setType(v ?? "Student"); setPicked([]); }} items={options({ Student: RECIPIENT_LABEL.Student, Teacher: RECIPIENT_LABEL.Teacher, Staff: RECIPIENT_LABEL.Staff, Department: RECIPIENT_LABEL.Department, Class: RECIPIENT_LABEL.Class })} /></FormField>
        <FormField label={t("Purpose")} htmlFor="bulk-purpose" optional><Input id="bulk-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></FormField>
      </div>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-48 flex-1"><SearchInput value={search} onValueChange={setSearch} placeholder={t("Filter the list")} aria-label={t("Filter recipients")} /></div>
          <Button type="button" variant="outline" size="sm" onClick={() => setPicked([...new Set([...picked, ...shown.map((p) => p.value)])])}>{t("Select all shown ({{count}})", { count: shown.length })}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPicked([])}>{t("Clear")}</Button>
          <Badge variant="info">{t("{{count}} selected", { count: picked.length })}</Badge>
        </div>
        <div className="max-h-52 overflow-y-auto rounded border border-border">
          {shown.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t("Nobody to show.")}</p>}
          {shown.slice(0, 400).map((p) => (
            <label key={p.value} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-0 hover:bg-muted/50">
              <Checkbox checked={picked.includes(p.value)} onCheckedChange={() => toggle(p.value)} aria-label={p.label} />
              <span className="flex-1 truncate">{p.label}</span><span className="text-xs text-muted-foreground">{p.hint}</span>
            </label>
          ))}
        </div>
        {errors.recipients && <p role="alert" className="text-xs text-destructive-strong">{errors.recipients}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2"><Switch id="bulk-returnable" checked={returnable} onCheckedChange={setReturnable} /><label htmlFor="bulk-returnable" className="text-sm">{t("Returnable")}</label></div>
        {returnable && <FormField label={t("Due back by")} htmlFor="bulk-return" required error={errors.returnBy}><Input id="bulk-return" type="date" min={todayIso()} value={returnBy} onChange={(e) => setReturnBy(e.target.value)} /></FormField>}
      </div>
      <p className="text-sm font-medium">{t("Items for each recipient")}</p>
      <LinesEditor lines={lines} onChange={setLines} storeId={storeId} showStock />
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}
    </FormDialog>
  );
}

function IssueView({ issue, onClose }: { issue: Issue | null; onClose: () => void }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const done = { invalidate: [["store"]], onSuccess: () => { setNote(""); onClose(); } };
  const decide = useApiMutation((approve: boolean) => decideIssue(issue!.id, approve, note), { ...done, success: (i) => (i.status === "Approved" ? "Request approved" : "Request rejected") });
  const fulfil = useApiMutation(() => fulfilIssue(issue!.id), { ...done, success: "Items issued" });
  const cancel = useApiMutation(() => cancelIssue(issue!.id), { ...done, success: "Request cancelled" });
  const i = issue;
  return (
    <PrintableDialog
      open={i !== null}
      onOpenChange={(v) => !v && onClose()}
      title={i ? t("Issue slip {{ref}}", { ref: i.reference }) : ""}
      wide
      actions={i && (
        <>
          {["Requested", "Approved"].includes(i.status) && <Button variant="ghost" onClick={() => cancel.mutate(undefined)} disabled={cancel.isPending}>{t("Cancel request")}</Button>}
          {i.status === "Requested" && access.reject && <Button variant="outline" disabled={decide.isPending || !note.trim()} onClick={() => decide.mutate(false)}><X className="h-4 w-4" /> {t("Reject")}</Button>}
          {i.status === "Requested" && access.approve && <Button disabled={decide.isPending} onClick={() => decide.mutate(true)}><Check className="h-4 w-4" /> {t("Approve")}</Button>}
          {i.status === "Approved" && access.issue && <Button disabled={fulfil.isPending} onClick={() => fulfil.mutate(undefined)}><PackageOpen className="h-4 w-4" /> {t("Hand over and issue")}</Button>}
          {["Issued", "PartiallyReturned"].includes(i.status) && i.isReturnable && access.returns && <Button variant="outline" onClick={() => navigate(`/store/returns?issue=${i.id}`)}><Undo2 className="h-4 w-4" /> {t("Record a return")}</Button>}
        </>
      )}
    >
      {i && (
        <>
          <SummaryGrid>
            <Field label={t("Status")}><StatusBadge status={i.overdue ? "overdue" : i.status} label={i.overdue ? t("Overdue for return") : t(ISSUE_STATUS_LABEL[i.status])} /></Field>
            <Field label={t("Issued to")}>{i.recipientName} <span className="text-xs text-muted-foreground">({t(RECIPIENT_LABEL[i.recipientType])}{i.recipientDetail ? `, ${i.recipientDetail}` : ""})</span></Field>
            <Field label={t("From store")}>{i.storeName}</Field>
            <Field label={t("Date")}>{formatDate(i.issueDate)}</Field>
            <Field label={t("Returnable")}>{i.isReturnable ? `${t("Yes, due")} ${formatDate(i.expectedReturnDate)}` : t("No")}</Field>
            <Field label={t("Purpose")}>{i.purpose}</Field>
            <Field label={t("Requested by")}>{i.requestedBy}</Field>
            <Field label={t("Approved by")}>{i.decidedBy}</Field>
            <Field label={t("Issued by")}>{i.issuedBy}</Field>
          </SummaryGrid>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">{t("Item")}</th><th className="py-1 text-right">{t("Issued")}</th><th className="py-1 text-right">{t("Returned")}</th><th className="py-1 text-right">{t("Written off")}</th><th className="py-1 text-right">{t("Still out")}</th></tr></thead>
            <tbody>{i.lines.map((l) => <tr key={l.id} className="border-b"><td className="py-1">{l.itemName}</td><td className="py-1 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td><td className="py-1 text-right tabular-nums">{qty(l.returnedQuantity)}</td><td className="py-1 text-right tabular-nums">{qty(l.writtenOffQuantity)}</td><td className="py-1 text-right tabular-nums">{i.isReturnable ? qty(l.outstanding) : "—"}</td></tr>)}</tbody>
          </table>
          {i.decisionNote && <p className="text-sm text-muted-foreground">{i.decisionNote}</p>}
          {i.status === "Requested" && access.reject && <div className="store-no-print"><FormField label={t("Reason for rejecting")} htmlFor="iss-reject" hint={t("Required to reject")}><Input id="iss-reject" value={note} onChange={(e) => setNote(e.target.value)} /></FormField></div>}
        </>
      )}
    </PrintableDialog>
  );
}

export default function IssuesPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<IssueStatus | undefined>();
  const [recipientType, setRecipientType] = useState<RecipientType | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const paging = usePageState(15);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewing, setViewing] = useState<Issue | null>(null);
  const filters = { search: search.trim() || undefined, status, recipientType, overdueOnly, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const query = useQuery({ queryKey: ["store", "issues", filters], queryFn: () => listIssues(filters), placeholderData: (p) => p });
  const canAsk = access.issue || access.request;
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); paging.reset(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={reset(setSearch)} placeholder={t("Search by number, recipient or purpose")} aria-label={t("Search issues")} /></div>
        <div className="w-52"><SelectField value={status} onChange={reset(setStatus)} allLabel={t("Any status")} items={options(ISSUE_STATUS_LABEL)} /></div>
        <div className="w-44"><SelectField value={recipientType} onChange={reset(setRecipientType)} allLabel={t("Any recipient")} items={options(RECIPIENT_LABEL)} /></div>
        <Button variant={overdueOnly ? "default" : "outline"} aria-pressed={overdueOnly} onClick={() => reset(setOverdueOnly)(!overdueOnly)}>{t("Overdue returns")}</Button>
        {access.issue && <Button variant="outline" onClick={() => setBulkOpen(true)}><Users className="h-4 w-4" /> {t("Bulk issue")}</Button>}
        {canAsk && <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> {access.issue ? t("Issue items") : t("Request items")}</Button>}
      </div>
      <PagedTable
        query={query}
        rowKey={(i) => i.id}
        onRowClick={setViewing}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No issues or requests")}
        emptyAction={canAsk ? <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> {access.issue ? t("Issue items") : t("Request items")}</Button> : undefined}
        columns={[
          { header: "Number", cell: (i) => <span className="font-medium">{i.reference}</span> },
          { header: "Date", cell: (i) => formatDate(i.issueDate) },
          { header: "Issued to", cell: (i) => <div><p>{i.recipientName}</p><p className="text-xs text-muted-foreground">{t(RECIPIENT_LABEL[i.recipientType])}{i.recipientDetail ? ` · ${i.recipientDetail}` : ""}</p></div> },
          { header: "Items", cell: (i) => i.lines.map((l) => `${l.itemName} × ${qty(l.quantity)}`).join(", ") },
          { header: "Returnable", cell: (i) => (i.isReturnable ? formatDate(i.expectedReturnDate) : "—") },
          { header: "Status", cell: (i) => <StatusBadge status={i.overdue ? "overdue" : i.status} label={i.overdue ? t("Overdue") : t(ISSUE_STATUS_LABEL[i.status])} /> },
        ]}
      />
      <IssueForm open={formOpen} onOpenChange={setFormOpen} />
      <BulkIssueForm open={bulkOpen} onOpenChange={setBulkOpen} />
      <IssueView issue={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
