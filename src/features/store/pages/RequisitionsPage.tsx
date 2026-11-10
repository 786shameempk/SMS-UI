import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Plus, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { cancelRequisition, createRequisition, decideRequisition, listRequisitions, submitRequisition, updateRequisition } from "../api";
import FormDialog from "../components/FormDialog";
import { PRIORITIES, REQUISITION_STATUS_LABEL } from "../constants";
import { Field, LinesEditor, PagedTable, PrintableDialog, SelectField, StoreSelect, SummaryGrid, formatDate, money, newLine, optional, options, qty, toNumber, useApiMutation, useItemCatalogue, usePageState, useStoreAccess, type EditableLine } from "../shared";
import type { Requisition, RequisitionStatus } from "../types";

function RequisitionForm({ open, onOpenChange, requisition }: { open: boolean; onOpenChange: (v: boolean) => void; requisition: Requisition | null }) {
  const { t } = useTranslation("store");
  const catalogue = useItemCatalogue();
  const [storeId, setStoreId] = useState<string | undefined>();
  const [department, setDepartment] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [neededBy, setNeededBy] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [seeded, setSeeded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = open ? (requisition?.id ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) {
      setStoreId(requisition?.storeId); setDepartment(requisition?.department ?? ""); setReason(requisition?.reason ?? ""); setPriority(requisition?.priority ?? "Normal"); setNeededBy(requisition?.neededBy ?? "");
      setLines(requisition ? requisition.lines.map((l) => newLine({ itemId: l.itemId, quantity: String(l.quantity), price: String(l.estimatedPrice), note: l.note ?? "" })) : [newLine()]);
      setErrors({});
    }
  }

  const save = useApiMutation(
    (submit: boolean) => {
      const body = { storeId: storeId!, neededBy: optional(neededBy), department: optional(department), reason: optional(reason), priority, submit, lines: lines.map((l) => ({ itemId: l.itemId, quantity: toNumber(l.quantity), estimatedPrice: toNumber(l.price), note: optional(l.note) })) };
      return requisition ? updateRequisition(requisition.id, body) : createRequisition(body);
    },
    { success: (r) => (r.status === "Submitted" ? "Requisition sent for approval" : "Draft saved"), invalidate: [["store", "requisitions"], ["store", "dashboard"], ["store", "notifications"]], onSuccess: () => onOpenChange(false) },
  );

  const run = (submit: boolean) => {
    const next: Record<string, string> = {};
    if (!storeId) next.store = t("Choose the store that needs the items");
    if (lines.some((l) => !l.itemId || toNumber(l.quantity) <= 0)) next.lines = t("Every line needs an item and a quantity above zero");
    if (new Set(lines.map((l) => l.itemId)).size !== lines.length) next.lines = t("An item appears more than once");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(submit);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={requisition ? t("Edit requisition {{ref}}", { ref: requisition.reference }) : t("New purchase requisition")} submitLabel={t("Submit for approval")} submitting={save.isPending}
      onSubmit={() => run(true)} size="xl"
      extraActions={<Button type="button" variant="secondary" disabled={save.isPending} onClick={() => run(false)}>{t("Save as draft")}</Button>}>
      <div className="grid gap-4 md:grid-cols-4">
        <FormField label={t("Store")} required error={errors.store}><StoreSelect value={storeId} onChange={setStoreId} /></FormField>
        <FormField label={t("Priority")}><SelectField value={priority} onChange={(v) => setPriority(v ?? "Normal")} items={PRIORITIES.map((p) => ({ value: p, label: p }))} /></FormField>
        <FormField label={t("Needed by")} htmlFor="req-needed" optional><Input id="req-needed" type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} /></FormField>
        <FormField label={t("Department")} htmlFor="req-dept" optional><Input id="req-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={t("Science, Office...")} /></FormField>
        <FormField label={t("Why is it needed?")} htmlFor="req-reason" optional className="md:col-span-4"><Textarea id="req-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
      </div>
      <LinesEditor lines={lines} onChange={setLines} showPrice priceLabel={t("Estimated price")} showNote itemList={catalogue.data}
        onItemPicked={(line, item) => (item && !line.price ? { price: String(item.purchasePrice || "") } : {})} />
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}
    </FormDialog>
  );
}

function RequisitionView({ requisition, onClose, onEdit }: { requisition: Requisition | null; onClose: () => void; onEdit: (r: Requisition) => void }) {
  const { t } = useTranslation("store");
  const navigate = useNavigate();
  const access = useStoreAccess();
  const [note, setNote] = useState("");
  const done = { onSuccess: () => { onClose(); setNote(""); }, invalidate: [["store", "requisitions"], ["store", "dashboard"], ["store", "notifications"]] };
  const submit = useApiMutation((id: string) => submitRequisition(id), { ...done, success: "Sent for approval" });
  const cancel = useApiMutation((id: string) => cancelRequisition(id), { ...done, success: "Requisition cancelled" });
  const decide = useApiMutation((v: { id: string; approve: boolean }) => decideRequisition(v.id, v.approve, note), { ...done, success: (r) => (r.status === "Approved" ? "Requisition approved" : "Requisition rejected") });
  const r = requisition;
  const mine = true;
  return (
    <PrintableDialog
      open={r !== null}
      onOpenChange={(v) => !v && onClose()}
      title={r ? t("Purchase requisition {{ref}}", { ref: r.reference }) : ""}
      wide
      actions={r && (
        <>
          {r.status === "Draft" && mine && <Button variant="outline" onClick={() => onEdit(r)}>{t("Edit")}</Button>}
          {r.status === "Draft" && <Button onClick={() => submit.mutate(r.id)} disabled={submit.isPending}><Send className="h-4 w-4" /> {t("Submit for approval")}</Button>}
          {r.status === "Approved" && access.create && <Button onClick={() => navigate(`/store/purchase-orders?fromRequisition=${r.id}`)}>{t("Create purchase order")}</Button>}
          {["Draft", "Submitted", "Approved"].includes(r.status) && <Button variant="ghost" onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending}>{t("Cancel requisition")}</Button>}
          {r.status === "Submitted" && access.reject && <Button variant="outline" onClick={() => note.trim() ? decide.mutate({ id: r.id, approve: false }) : document.getElementById("req-decision-note")?.focus()}><X className="h-4 w-4" /> {t("Reject")}</Button>}
          {r.status === "Submitted" && access.approve && <Button onClick={() => decide.mutate({ id: r.id, approve: true })} disabled={decide.isPending}><Check className="h-4 w-4" /> {t("Approve")}</Button>}
        </>
      )}
    >
      {r && (
        <>
          <SummaryGrid>
            <Field label={t("Status")}><StatusBadge status={r.status} label={t(REQUISITION_STATUS_LABEL[r.status])} /></Field>
            <Field label={t("Store")}>{r.storeName}</Field>
            <Field label={t("Priority")}>{r.priority}</Field>
            <Field label={t("Raised by")}>{r.requestedBy}</Field>
            <Field label={t("Date")}>{formatDate(r.requestedOn)}</Field>
            <Field label={t("Needed by")}>{formatDate(r.neededBy)}</Field>
            <Field label={t("Department")}>{r.department}</Field>
            <Field label={t("Order")}>{r.purchaseOrderReference}</Field>
            <Field label={t("Estimated total")}>{money(r.estimatedTotal)}</Field>
          </SummaryGrid>
          {r.reason && <p className="text-sm">{r.reason}</p>}
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">{t("Item")}</th><th className="py-1 text-right">{t("Quantity")}</th><th className="py-1 text-right">{t("Estimated price")}</th></tr></thead>
            <tbody>{r.lines.map((l) => <tr key={l.id} className="border-b"><td className="py-1">{l.itemName} <span className="text-xs text-muted-foreground">{l.sku}</span></td><td className="py-1 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td><td className="py-1 text-right tabular-nums">{money(l.estimatedPrice)}</td></tr>)}</tbody>
          </table>
          {r.decidedBy && <p className="text-sm text-muted-foreground">{t("{{who}} decided on {{date}}.", { who: r.decidedBy, date: formatDate(r.decidedAt) })} {r.decisionNote}</p>}
          {r.status === "Submitted" && (access.approve || access.reject) && (
            <div className="store-no-print"><FormField label={t("Decision note")} htmlFor="req-decision-note" hint={t("Required when rejecting")}><Input id="req-decision-note" value={note} onChange={(e) => setNote(e.target.value)} /></FormField></div>
          )}
        </>
      )}
    </PrintableDialog>
  );
}

export default function RequisitionsPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RequisitionStatus | undefined>();
  const [storeId, setStoreId] = useState<string | undefined>();
  const paging = usePageState(15);
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Requisition | null>(null);
  const filters = { search: search.trim() || undefined, status, storeId, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const query = useQuery({ queryKey: ["store", "requisitions", filters], queryFn: () => listRequisitions(filters), placeholderData: (p) => p });
  const canRaise = access.request || access.create;
  const open = (r: Requisition | null) => { setEditing(r); setViewing(null); setFormOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={(v) => { setSearch(v); paging.reset(); }} placeholder={t("Search by number, department or requester")} aria-label={t("Search requisitions")} /></div>
        <div className="w-48"><SelectField value={status} onChange={(v) => { setStatus(v); paging.reset(); }} allLabel={t("Any status")} items={options(REQUISITION_STATUS_LABEL)} /></div>
        <div className="w-48"><StoreSelect value={storeId} onChange={(v) => { setStoreId(v); paging.reset(); }} allLabel={t("All stores")} /></div>
        {canRaise && <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> {t("New requisition")}</Button>}
      </div>
      <PagedTable
        query={query}
        rowKey={(r) => r.id}
        onRowClick={setViewing}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No requisitions")}
        emptyDescription={canRaise ? t("Raise one when something needs to be bought.") : undefined}
        emptyAction={canRaise ? <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> {t("New requisition")}</Button> : undefined}
        columns={[
          { header: "Number", cell: (r) => <span className="font-medium">{r.reference}</span> },
          { header: "Date", cell: (r) => formatDate(r.requestedOn) },
          { header: "Store", cell: (r) => r.storeName },
          { header: "Raised by", cell: (r) => r.requestedBy ?? "—" },
          { header: "Items", align: "right", cell: (r) => r.lines.length },
          { header: "Estimate", align: "right", cell: (r) => money(r.estimatedTotal) },
          { header: "Priority", cell: (r) => r.priority },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} label={t(REQUISITION_STATUS_LABEL[r.status])} /> },
        ]}
      />
      <RequisitionForm open={formOpen} onOpenChange={setFormOpen} requisition={editing} />
      <RequisitionView requisition={viewing} onClose={() => setViewing(null)} onEdit={open} />
    </div>
  );
}
