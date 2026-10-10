import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { createCategory, deleteCategory, getSettings, listCategories, reorderCategories, saveSettings, updateCategory } from "../api";
import { ColorDot, useApiMutation } from "../shared";
import type { Category, Settings } from "../types";

export default function SettingsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SettingsCard />
      <CategoriesCard />
    </div>
  );
}

function SettingsCard() {
  const settings = useQuery({ queryKey: ["extracurricular", "settings"], queryFn: getSettings });
  const [v, setV] = useState<Settings | null>(null);
  const [limit, setLimit] = useState("0");
  useEffect(() => {
    if (settings.data) {
      setV(settings.data);
      setLimit(String(settings.data.maxActivitiesPerStudent));
    }
  }, [settings.data]);
  const save = useApiMutation(saveSettings, { success: "Settings saved" });
  const limitError = !/^\d+$/.test(limit) || Number(limit) > 50 ? "Enter a number from 0 to 50 (0 means no limit)" : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rules</CardTitle>
        <CardDescription>How enrollment and groups behave across the school.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.isLoading && <Skeleton className="h-32 w-full" />}
        {settings.isError && <ErrorState onRetry={() => settings.refetch()} retrying={settings.isFetching} />}
        {v && (
          <>
            <FormField label="Most activities per student" htmlFor="st-limit" error={limitError} hint="0 means no limit. Counts live requests and places.">
              <Input id="st-limit" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-28" aria-invalid={limitError ? true : undefined} />
            </FormField>
            {([
              ["allowSelfEnrollment", "Parents and students can ask to join", "Off: only staff enroll students."],
              ["preventScheduleConflicts", "Stop clashing sessions", "An approval is refused if the student would be in two sessions at once."],
              ["singleGroupPerKind", "One house or group of each kind per student", "Moving a student replaces their old house instead of adding a second."],
            ] as const).map(([key, label, hint]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
                <Switch checked={v[key]} onCheckedChange={(c) => setV({ ...v, [key]: c })} aria-label={label} />
              </label>
            ))}
            <Button disabled={Boolean(limitError)} loading={save.isPending} onClick={() => save.mutate({ ...v, maxActivitiesPerStudent: Number(limit) })}>
              Save rules
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CategoriesCard() {
  const categories = useQuery({ queryKey: ["extracurricular", "categories"], queryFn: () => listCategories(true) });
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<Category | null>(null);
  const reorder = useApiMutation(reorderCategories);
  const remove = useApiMutation(deleteCategory, { success: "Category deleted", onSuccess: () => setRemoving(null) });
  const list = categories.data ?? [];

  const move = (index: number, delta: number) => {
    const ids = list.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Add your own, rename, hide or reorder. Hidden categories keep their old activities.</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {categories.isLoading && <Skeleton className="h-40 w-full" />}
        {categories.isError && <ErrorState onRetry={() => categories.refetch()} retrying={categories.isFetching} />}
        <ul className="divide-y divide-border rounded-lg border border-border empty:hidden">
          {list.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <ColorDot color={c.color} />
                <span className={`truncate ${c.isActive ? "" : "text-muted-foreground line-through"}`}>{c.name}</span>
                {c.isSustainability && <Badge variant="success">Green</Badge>}
                <span className="text-xs text-muted-foreground">{c.activityCount}</span>
              </span>
              <span className="flex shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Move ${c.name} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${c.name}`} onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${c.name}`} onClick={() => setRemoving(c)}><Trash2 className="h-3.5 w-3.5 text-destructive-strong" /></Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CategoryDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Delete category"
        description={`Delete "${removing?.name}"? A category that has activities can't be deleted: hide it instead.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
      />
    </Card>
  );
}

function CategoryDialog({ open, onOpenChange, category }: { open: boolean; onOpenChange: (o: boolean) => void; category: Category | null }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [active, setActive] = useState(true);
  const [green, setGreen] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setName(category?.name ?? "");
    setColor(category?.color ?? "#6366f1");
    setActive(category?.isActive ?? true);
    setGreen(category?.isSustainability ?? false);
  }, [open, category]);
  const save = useApiMutation((body: Pick<Category, "name" | "color" | "isActive" | "isSustainability">) => (category ? updateCategory(category.id, body) : createCategory(body)), { success: "Category saved", onSuccess: () => onOpenChange(false) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Categories group activities in lists and reports.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!name.trim()) return; save.mutate({ name: name.trim(), color, isActive: active, isSustainability: green }); }}>
          <FormField label="Name" htmlFor="cat-name" required error={touched && !name.trim() ? "Name is required" : undefined}><Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} /></FormField>
          <FormField label="Colour" htmlFor="cat-color"><Input id="cat-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-20 p-1" /></FormField>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Shown when creating activities</span><Switch checked={active} onCheckedChange={setActive} aria-label="Active" /></label>
          <label className="flex items-center justify-between gap-3 text-sm"><span>Environmental / green category</span><Switch checked={green} onCheckedChange={setGreen} aria-label="Green category" /></label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
