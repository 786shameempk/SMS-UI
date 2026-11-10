import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listStaff } from "@/features/staff/api";
import { createStore, deleteStore, getSettings, saveSettings, updateStore } from "../api";
import FormDialog from "../components/FormDialog";
import { SelectField, money, optional, qty, useApiMutation, useStoreAccess, useStores } from "../shared";
import type { Settings, StaffRole, Store, StoreStaff } from "../types";

const ROLE_ITEMS: { value: StaffRole; label: string }[] = [{ value: "Manager", label: "Store manager" }, { value: "Keeper", label: "Store keeper" }];

interface FormState {
  name: string;
  code: string;
  location: string;
  description: string;
  isActive: boolean;
  staff: StoreStaff[];
}

const blank: FormState = { name: "", code: "", location: "", description: "", isActive: true, staff: [] };

function StoreForm({ open, onOpenChange, store }: { open: boolean; onOpenChange: (open: boolean) => void; store: Store | null }) {
  const { t } = useTranslation("store");
  const [form, setForm] = useState<FormState>(blank);
  const [seeded, setSeeded] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const staff = useQuery({ queryKey: ["store", "staff-pick"], queryFn: listStaff, enabled: open, staleTime: 5 * 60_000 });
  const key = open ? (store?.id ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) {
      setForm(store ? { name: store.name, code: store.code, location: store.location ?? "", description: store.description ?? "", isActive: store.isActive, staff: store.staff } : blank);
      setErrors({});
      setPick("");
    }
  }

  const save = useApiMutation((s: FormState) => {
    const body = { name: s.name.trim(), code: s.code.trim(), location: optional(s.location), description: optional(s.description), isActive: s.isActive, staff: s.staff };
    return store ? updateStore(store.id, body) : createStore(body);
  }, { success: () => (store ? "Store saved" : "Store created"), onSuccess: () => onOpenChange(false) });

  const people = (staff.data ?? []).filter((p) => p.userId && p.status === "active" && !form.staff.some((s) => s.userId === p.userId));
  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t("Enter a store name");
    if (!form.code.trim()) next.code = t("Enter a short code, such as MAIN");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(form);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={store ? t("Edit store") : t("New store or warehouse")} submitLabel={store ? t("Save changes") : t("Create store")} submitting={save.isPending} onSubmit={submit} size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("Name")} htmlFor="store-name" required error={errors.name}>
          <Input id="store-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={150} />
        </FormField>
        <FormField label={t("Code")} htmlFor="store-code" required error={errors.code}>
          <Input id="store-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={30} />
        </FormField>
        <FormField label={t("Location")} htmlFor="store-location" optional className="sm:col-span-2">
          <Input id="store-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("Block A, ground floor")} />
        </FormField>
        <FormField label={t("Description")} htmlFor="store-description" optional className="sm:col-span-2">
          <Textarea id="store-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="store-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
        <label htmlFor="store-active" className="text-sm">{t("Active (can receive and issue stock)")}</label>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-sm font-medium">{t("Managers and authorised staff")}</p>
        <p className="text-xs text-muted-foreground">{t("Anyone listed here can only work in the stores they are assigned to. People not listed anywhere can use every store of the campus.")}</p>
        {form.staff.map((s) => (
          <div key={s.userId} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
            <div className="w-40">
              <SelectField value={s.role} items={ROLE_ITEMS} onChange={(role) => setForm({ ...form, staff: form.staff.map((x) => (x.userId === s.userId ? { ...x, role: role ?? "Keeper" } : x)) })} />
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label={t("Remove {{name}}", { name: s.name })} onClick={() => setForm({ ...form, staff: form.staff.filter((x) => x.userId !== s.userId) })}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Combobox
              aria-label={t("Add a staff member")}
              value={pick || null}
              onValueChange={(userId) => {
                const person = people.find((p) => p.userId === userId);
                if (person) setForm({ ...form, staff: [...form.staff, { userId, name: `${person.firstName} ${person.lastName}`.trim(), role: "Keeper" }] });
                setPick("");
              }}
              options={people.map((p) => ({ value: p.userId!, label: `${p.firstName} ${p.lastName}`.trim(), hint: [p.employeeId, p.department].filter(Boolean).join(" · ") }))}
              placeholder={t("Add a staff member with a login")}
            />
          </div>
          <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
    </FormDialog>
  );
}

function SettingsCard() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const settings = useQuery({ queryKey: ["store", "settings"], queryFn: getSettings });
  const save = useApiMutation((s: Settings) => saveSettings(s), { success: "Store rules saved", invalidate: [["store", "settings"]] });
  const s = settings.data;
  if (!s) return settings.isError ? <ErrorState onRetry={() => settings.refetch()} /> : <Skeleton className="h-32 w-full" />;
  const row = (label: string, hint: string, key: keyof Settings) => (
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
      <Switch checked={s[key]} disabled={!access.edit || save.isPending} onCheckedChange={(v) => save.mutate({ ...s, [key]: v })} aria-label={label} />
    </div>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Store rules")}</CardTitle>
        <CardDescription>{t("How strict the school wants stock control to be.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {row(t("Approve item requests before issuing"), t("Anyone's request waits for an approver, even if they could issue directly."), "requireIssueApproval")}
        {row(t("Approve goods receipts before stock is added"), t("A receipt stays pending and adds no stock until it is approved."), "requireReceiptApproval")}
        {row(t("Alert managers about low stock"), t("Raise an alert when an item reaches its minimum level."), "notifyLowStock")}
        {!access.edit && <p className="text-xs text-muted-foreground">{t("Only people who can edit store records can change these.")}</p>}
      </CardContent>
    </Card>
  );
}

export default function StoresPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const stores = useStores(true);
  const [editing, setEditing] = useState<Store | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<Store | null>(null);
  const remove = useApiMutation(deleteStore, {
    success: (r) => (r.removed ? "Store deleted" : "This store has history, so it was made inactive instead"),
    onSuccess: () => setRemoving(null),
  });
  const open = (store: Store | null) => { setEditing(store); setFormOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("Each store or warehouse keeps its own stock. Items are shared by the whole school.")}</p>
        {access.create && <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> {t("New store")}</Button>}
      </div>
      {stores.isError && <ErrorState onRetry={() => stores.refetch()} retrying={stores.isFetching} />}
      {stores.isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full" />)}</div>}
      {stores.data && stores.data.length === 0 && (
        <EmptyState title={t("No stores yet")} description={access.create ? t("Create the first store or warehouse to start tracking stock.") : t("Ask a store manager to set one up.")}
          action={access.create ? <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> {t("New store")}</Button> : undefined} />
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(stores.data ?? []).map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{s.name}</CardTitle>
                  <CardDescription>{s.code}{s.location ? ` · ${s.location}` : ""}</CardDescription>
                </div>
                <Badge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? t("Active") : t("Inactive")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-semibold tabular-nums">{s.itemCount}</p><p className="text-xs text-muted-foreground">{t("Items")}</p></div>
                <div><p className="text-lg font-semibold tabular-nums">{qty(s.totalQuantity)}</p><p className="text-xs text-muted-foreground">{t("Units")}</p></div>
                <div><p className="text-lg font-semibold tabular-nums">{money(s.stockValue)}</p><p className="text-xs text-muted-foreground">{t("Value")}</p></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {s.staff.length === 0 && <span className="text-xs text-muted-foreground">{t("No staff assigned: open to everyone with access.")}</span>}
                {s.staff.map((m) => <Badge key={m.userId} variant={m.role === "Manager" ? "info" : "neutral"}>{m.name} · {m.role === "Manager" ? t("Manager") : t("Keeper")}</Badge>)}
              </div>
              {(access.edit || access.remove) && (
                <div className="flex gap-2">
                  {access.edit && <Button size="sm" variant="outline" onClick={() => open(s)}><Pencil className="h-3.5 w-3.5" /> {t("Edit")}</Button>}
                  {access.remove && <Button size="sm" variant="ghost" onClick={() => setRemoving(s)}><Trash2 className="h-3.5 w-3.5" /> {t("Delete")}</Button>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <SettingsCard />
      <StoreForm open={formOpen} onOpenChange={setFormOpen} store={editing} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={t("Delete this store?")}
        description={t("{{name}} is deleted if nothing has ever happened in it; otherwise it is made inactive so its history stays readable.", { name: removing?.name })}
        confirmLabel={t("Delete")}
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => { if (removing) remove.mutate(removing.id); }}
      />
    </div>
  );
}
