import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { createReturn, decideReturn, getSupplierOptions, listIssues, listReturns, listSales } from "../api";
import FormDialog from "../components/FormDialog";
import { CONDITION_LABEL, RETURN_KIND_LABEL, RETURN_STATUS_LABEL } from "../constants";
import { Field, LinesEditor, PagedTable, PrintableDialog, SelectField, StoreSelect, SummaryGrid, formatDate, newLine, options, qty, toNumber, useApiMutation, usePageState, useStoreAccess, type EditableLine } from "../shared";
import type { ReturnCondition, ReturnKind, ReturnStatus, StoreReturn } from "../types";

interface SourceLine { lineId: string; itemName: string; unit: string; max: number; quantity: string; condition: ReturnCondition }

function ReturnForm({ open, onOpenChange, presetIssueId }: { open: boolean; onOpenChange: (v: boolean) => void; presetIssueId?: string }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [kind, setKind] = useState<ReturnKind>("Issue");
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [storeId, setStoreId] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<SourceLine[]>([]);
  const [itemLines, setItemLines] = useState<EditableLine[]>([newLine()]);
  const [approveNow, setApproveNow] = useState(false);
  const [seeded, setSeeded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = open ? (presetIssueId ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) { setKind("Issue"); setSourceId(presetIssueId); setStoreId(undefined); setSupplierId(undefined); setReason(""); setLines([]); setItemLines([newLine()]); setApproveNow(false); setErrors({}); }
  }

  const issues = useQuery({ queryKey: ["store", "issues", "returnable"], queryFn: () => listIssues({ pageSize: 200 }), enabled: open && kind === "Issue", staleTime: 15_000 });
  const sales = useQuery({ queryKey: ["store", "sales", "returnable"], queryFn: () => listSales({ pageSize: 200 }), enabled: open && kind === "Sale", staleTime: 15_000 });
  const suppliers = useQuery({ queryKey: ["store", "suppliers", "pick"], queryFn: getSupplierOptions, enabled: open && kind === "Supplier", staleTime: 60_000 });
  const returnable = (issues.data?.items ?? []).filter((i) => i.isReturnable && (i.status === "Issued" || i.status === "PartiallyReturned"));
  const sold = (sales.data?.items ?? []).filter((s) => s.lines.some((l) => l.quantity - l.returnedQuantity > 0));

  const choose = (id: string | undefined) => {
    setSourceId(id);
    if (kind === "Issue") {
      const issue = returnable.find((i) => i.id === id);
      setLines((issue?.lines ?? []).filter((l) => l.outstanding > 0).map((l) => ({ lineId: l.id, itemName: l.itemName, unit: l.unit, max: l.outstanding, quantity: String(l.outstanding), condition: "Good" })));
    } else {
      const sale = sold.find((s) => s.id === id);
      setLines((sale?.lines ?? []).filter((l) => l.quantity - l.returnedQuantity > 0).map((l) => ({ lineId: l.id, itemName: l.itemName, unit: l.unit, max: l.quantity - l.returnedQuantity, quantity: "", condition: "Good" })));
    }
  };
  // A preset issue is chosen as soon as the list has loaded.
  const [applied, setApplied] = useState<string | null>(null);
  if (kind === "Issue" && presetIssueId && applied !== presetIssueId && returnable.some((i) => i.id === presetIssueId)) { setApplied(presetIssueId); choose(presetIssueId); }

  const save = useApiMutation(
    () => createReturn({
      kind, issueId: kind === "Issue" ? sourceId : null, saleId: kind === "Sale" ? sourceId : null, supplierId: kind === "Supplier" ? supplierId : null, storeId: kind === "Supplier" ? storeId : null, reason: reason.trim() || null, approveNow,
      lines: kind === "Supplier"
        ? itemLines.map((l) => ({ itemId: l.itemId, quantity: toNumber(l.quantity), condition: "Good" as ReturnCondition }))
        : lines.filter((l) => toNumber(l.quantity) > 0).map((l) => ({ sourceLineId: l.lineId, quantity: toNumber(l.quantity), condition: l.condition })),
    }),
    { success: (r) => (r.status === "Approved" ? "Return recorded and stock updated" : "Return sent for approval"), invalidate: [["store"]], onSuccess: () => onOpenChange(false) },
  );

  const submit = () => {
    const next: Record<string, string> = {};
    if (kind === "Supplier") {
      if (!storeId) next.store = t("Choose the store the goods are in");
      if (!supplierId) next.supplier = t("Choose the supplier");
      if (!reason.trim()) next.reason = t("Say why the goods are going back");
      if (itemLines.some((l) => !l.itemId || toNumber(l.quantity) <= 0)) next.lines = t("Every line needs an item and a quantity above zero");
    } else {
      if (!sourceId) next.source = kind === "Issue" ? t("Choose the issue the items came from") : t("Choose the sale");
      else if (lines.every((l) => toNumber(l.quantity) <= 0)) next.lines = t("Enter a quantity for at least one item");
      else if (lines.some((l) => toNumber(l.quantity) > l.max)) next.lines = t("A quantity is more than can still be returned");
    }
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t("New return")} description={t("Stock changes when the return is approved, depending on the condition of each item.")} submitLabel={approveNow ? t("Record and approve") : t("Send for approval")} submitting={save.isPending} onSubmit={submit} size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("Kind of return")}><SelectField value={kind} onChange={(v) => { setKind(v ?? "Issue"); setSourceId(undefined); setLines([]); }} items={options(RETURN_KIND_LABEL)} /></FormField>
        {kind !== "Supplier" ? (
          <FormField label={kind === "Issue" ? t("Issue") : t("Sale")} required error={errors.source}>
            <SelectField value={sourceId} onChange={choose} placeholder={t("Choose")}
              items={kind === "Issue" ? returnable.map((i) => ({ value: i.id, label: `${i.reference} · ${i.recipientName}` })) : sold.map((s) => ({ value: s.id, label: `${s.reference} · ${s.buyerName}` }))} />
          </FormField>
        ) : (
          <>
            <FormField label={t("Store")} required error={errors.store}><StoreSelect value={storeId} onChange={setStoreId} /></FormField>
            <FormField label={t("Supplier")} required error={errors.supplier}><SelectField value={supplierId} onChange={setSupplierId} items={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name }))} /></FormField>
          </>
        )}
      </div>

      {kind !== "Supplier" && lines.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40 text-left"><th className="p-2">{t("Item")}</th><th className="p-2 text-right">{t("Can return")}</th><th className="w-28 p-2">{t("Returning")}</th><th className="w-56 p-2">{t("Condition")}</th></tr></thead>
            <tbody>{lines.map((l) => (
              <tr key={l.lineId} className="border-b">
                <td className="p-2">{l.itemName}</td>
                <td className="p-2 text-right tabular-nums">{qty(l.max)} {l.unit}</td>
                <td className="p-2"><Input inputMode="decimal" aria-label={t("Returning: {{name}}", { name: l.itemName })} value={l.quantity} onChange={(e) => setLines(lines.map((x) => (x.lineId === l.lineId ? { ...x, quantity: e.target.value } : x)))} /></td>
                <td className="p-2"><SelectField value={l.condition} onChange={(v) => setLines(lines.map((x) => (x.lineId === l.lineId ? { ...x, condition: v ?? "Good" } : x)))} items={options(CONDITION_LABEL).filter((o) => kind === "Issue" || o.value !== "Lost")} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {kind === "Supplier" && <LinesEditor lines={itemLines} onChange={setItemLines} storeId={storeId} showStock />}
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}
      <FormField label={t("Reason")} htmlFor="ret-reason" optional={kind !== "Supplier"} error={errors.reason}><Textarea id="ret-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
      {access.approve && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={approveNow} onChange={(e) => setApproveNow(e.target.checked)} /> {t("Approve it now (I am allowed to)")}</label>}
    </FormDialog>
  );
}

function ReturnView({ ret, onClose }: { ret: StoreReturn | null; onClose: () => void }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [note, setNote] = useState("");
  const decide = useApiMutation((approve: boolean) => decideReturn(ret!.id, approve, note), { success: (r) => (r.status === "Approved" ? "Return approved and stock updated" : "Return rejected"), invalidate: [["store"]], onSuccess: () => { setNote(""); onClose(); } });
  const r = ret;
  return (
    <PrintableDialog
      open={r !== null}
      onOpenChange={(v) => !v && onClose()}
      title={r ? t("Return {{ref}}", { ref: r.reference }) : ""}
      actions={r?.status === "Requested" && (
        <>
          {access.reject && <Button variant="outline" disabled={decide.isPending || !note.trim()} onClick={() => decide.mutate(false)}><X className="h-4 w-4" /> {t("Reject")}</Button>}
          {access.approve && <Button disabled={decide.isPending} onClick={() => decide.mutate(true)}><Check className="h-4 w-4" /> {t("Approve")}</Button>}
        </>
      )}
    >
      {r && (
        <>
          <SummaryGrid>
            <Field label={t("Status")}><StatusBadge status={r.status} label={t(RETURN_STATUS_LABEL[r.status])} /></Field>
            <Field label={t("Kind")}>{t(RETURN_KIND_LABEL[r.kind])}</Field>
            <Field label={t("Store")}>{r.storeName}</Field>
            <Field label={t("From / to")}>{r.partyName}</Field>
            <Field label={t("Source")}>{r.issueReference ?? r.saleReference}</Field>
            <Field label={t("Requested by")}>{r.requestedBy}</Field>
            <Field label={t("Decided by")}>{r.decidedBy}</Field>
          </SummaryGrid>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">{t("Item")}</th><th className="py-1 text-right">{t("Quantity")}</th><th className="py-1">{t("Condition")}</th></tr></thead>
            <tbody>{r.lines.map((l) => <tr key={l.id} className="border-b"><td className="py-1">{l.itemName}</td><td className="py-1 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td><td className="py-1">{t(CONDITION_LABEL[l.condition])}</td></tr>)}</tbody>
          </table>
          {r.reason && <p className="text-sm">{r.reason}</p>}
          {r.decisionNote && <p className="text-sm text-muted-foreground">{r.decisionNote}</p>}
          {r.status === "Requested" && access.reject && <div className="store-no-print"><FormField label={t("Reason for rejecting")} htmlFor="ret-reject" hint={t("Required to reject")}><Input id="ret-reject" value={note} onChange={(e) => setNote(e.target.value)} /></FormField></div>}
        </>
      )}
    </PrintableDialog>
  );
}

export default function ReturnsPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [params, setParams] = useSearchParams();
  const presetIssue = params.get("issue") ?? undefined;
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<ReturnKind | undefined>();
  const [status, setStatus] = useState<ReturnStatus | undefined>();
  const paging = usePageState(15);
  const [formOpen, setFormOpen] = useState(Boolean(presetIssue));
  const [viewing, setViewing] = useState<StoreReturn | null>(null);
  const filters = { search: search.trim() || undefined, kind, status, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const query = useQuery({ queryKey: ["store", "returns", filters], queryFn: () => listReturns(filters), placeholderData: (p) => p });
  const closeForm = (v: boolean) => { setFormOpen(v); if (!v && presetIssue) { const next = new URLSearchParams(params); next.delete("issue"); setParams(next, { replace: true }); } };
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); paging.reset(); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={reset(setSearch)} placeholder={t("Search by return number")} aria-label={t("Search returns")} /></div>
        <div className="w-52"><SelectField value={kind} onChange={reset(setKind)} allLabel={t("Any kind")} items={options(RETURN_KIND_LABEL)} /></div>
        <div className="w-48"><SelectField value={status} onChange={reset(setStatus)} allLabel={t("Any status")} items={options(RETURN_STATUS_LABEL)} /></div>
        {access.returns && <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> {t("New return")}</Button>}
      </div>
      <PagedTable
        query={query}
        rowKey={(r) => r.id}
        onRowClick={setViewing}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No returns")}
        columns={[
          { header: "Number", cell: (r) => <span className="font-medium">{r.reference}</span> },
          { header: "Date", cell: (r) => formatDate(r.createdAt) },
          { header: "Kind", cell: (r) => t(RETURN_KIND_LABEL[r.kind]) },
          { header: "From / to", cell: (r) => r.partyName ?? "—" },
          { header: "Items", cell: (r) => r.lines.map((l) => `${l.itemName} × ${qty(l.quantity)}`).join(", ") },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} label={t(RETURN_STATUS_LABEL[r.status])} /> },
        ]}
      />
      <ReturnForm open={formOpen} onOpenChange={closeForm} presetIssueId={presetIssue} />
      <ReturnView ret={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
