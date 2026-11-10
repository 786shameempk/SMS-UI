import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Link2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/utils/cn";
import { moveItem } from "../definition";
import type { ColumnSpec, CustomReportDefinition, DatasetField, ReportService } from "../types";
import SamplePreview from "./SamplePreview";

interface Props {
  datasetKey: string;
  service?: ReportService;
  fields: DatasetField[];
  definition: CustomReportDefinition;
  onChange: (columns: ColumnSpec[]) => void;
}

const fieldLabel = (fields: DatasetField[], key: string) => fields.find((f) => f.key === key)?.label ?? key;

/**
 * Step 2: which columns appear, in what order and under what names. Every column the data source offers (for the signed-in
 * role) is listed under the record it comes from; related records (parent, class, subject ...) have their own headings.
 */
export default function ColumnsStep({ datasetKey, service, fields, definition, onChange }: Props) {
  const { t } = useTranslation("reports");
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const columns = definition.columns;
  const chosen = useMemo(() => new Set(columns.map((c) => c.field)), [columns]);

  const visibleFields = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? fields.filter((f) => f.label.toLowerCase().includes(term) || f.group.toLowerCase().includes(term)) : fields;
  }, [fields, search]);
  const groups = useMemo(() => {
    const map = new Map<string, DatasetField[]>();
    for (const f of visibleFields) map.set(f.group, [...(map.get(f.group) ?? []), f]);
    return [...map.entries()];
  }, [visibleFields]);

  const toggle = (key: string, on: boolean) =>
    onChange(on ? (chosen.has(key) ? columns : [...columns, { field: key, label: null, visible: true }]) : columns.filter((c) => c.field !== key));

  const allVisibleChosen = visibleFields.length > 0 && visibleFields.every((f) => chosen.has(f.key));
  const selectAll = () => onChange([...columns, ...visibleFields.filter((f) => !chosen.has(f.key)).map((f) => ({ field: f.key, label: null, visible: true }))]);
  const deselectAll = () => {
    const drop = new Set(visibleFields.map((f) => f.key));
    onChange(columns.filter((c) => !drop.has(c.field)));
  };
  const update = (index: number, patch: Partial<ColumnSpec>) => onChange(columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">{t("Choose the columns")}</h2>
        <p className="text-sm text-muted-foreground">{t("Tick the columns you want, then drag them into the order they should appear. You can rename a column or hide it without removing it.")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Available */}
        <section aria-label={t("Available columns")} className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search columns…")} containerClassName="sm:w-56" />
            <Button type="button" variant="outline" size="sm" onClick={allVisibleChosen ? deselectAll : selectAll} disabled={visibleFields.length === 0}>
              {allVisibleChosen ? t("Deselect all") : t("Select all")}
              {search.trim() ? ` (${visibleFields.length})` : ""}
            </Button>
          </div>
          <div className="max-h-[26rem] space-y-4 overflow-y-auto p-3">
            {groups.length === 0 && <p className="text-sm text-muted-foreground">{t("No column matches “{{search}}”.", { search })}</p>}
            {groups.map(([group, items]) => (
              <fieldset key={group} className="space-y-1">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(group)}</legend>
                {items.map((f) => (
                  <label key={f.key} className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-secondary/60">
                    <Checkbox checked={chosen.has(f.key)} onCheckedChange={(v) => toggle(f.key, v === true)} className="mt-0.5" />
                    <span className="min-w-0 text-sm">
                      {f.label}
                      {f.computed && <Link2 className="ms-1 inline h-3 w-3 text-muted-foreground" aria-label={t("Looked up from another record; it cannot be sorted, grouped or totalled")} />}
                      {f.sensitive && <Lock className="ms-1 inline h-3 w-3 text-muted-foreground" aria-label={t("Restricted column")} />}
                      {f.hint && <span className="block text-xs text-muted-foreground">{f.hint}</span>}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </section>

        {/* Selected, reorderable */}
        <section aria-label={t("Selected columns")} className="rounded-xl border bg-card">
          <div className="border-b p-3 text-sm font-medium">{t("Selected columns ({{n}})", { n: columns.length })}</div>
          {columns.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("Nothing selected yet. Tick columns on the left.")}</p>
          ) : (
            <ol className="max-h-[26rem] space-y-1.5 overflow-y-auto p-3">
              {columns.map((c, i) => (
                <li
                  key={c.field}
                  draggable
                  onDragStart={(e) => { setDragging(i); e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                  onDrop={(e) => { e.preventDefault(); if (dragging !== null) onChange(moveItem(columns, dragging, i)); setDragging(null); setOver(null); }}
                  className={cn("flex flex-wrap items-center gap-1.5 rounded-lg border bg-background p-1.5", over === i && dragging !== i && "border-primary ring-1 ring-primary/40", dragging === i && "opacity-50", !c.visible && "bg-muted/50")}
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
                  <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="min-w-[9rem] flex-1">
                    <Input
                      value={c.label ?? ""}
                      placeholder={fieldLabel(fields, c.field)}
                      onChange={(e) => update(i, { label: e.target.value })}
                      aria-label={t("Display name for {{name}}", { name: fieldLabel(fields, c.field) })}
                      maxLength={200}
                      className="h-8"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => update(i, { visible: !c.visible })} aria-pressed={!c.visible} aria-label={c.visible ? t("Hide {{name}}", { name: fieldLabel(fields, c.field) }) : t("Show {{name}}", { name: fieldLabel(fields, c.field) })}>
                    {c.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => onChange(moveItem(columns, i, i - 1))} aria-label={t("Move {{name}} up", { name: fieldLabel(fields, c.field) })}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === columns.length - 1} onClick={() => onChange(moveItem(columns, i, i + 1))} aria-label={t("Move {{name}} down", { name: fieldLabel(fields, c.field) })}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => toggle(c.field, false)} aria-label={t("Remove {{name}}", { name: fieldLabel(fields, c.field) })}><X className="h-4 w-4" /></Button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section aria-label={t("Preview of the selected columns")} className="space-y-2">
        <h3 className="text-sm font-medium">{t("Preview")}</h3>
        <SamplePreview datasetKey={datasetKey} service={service} definition={definition} fields={fields} />
      </section>
    </div>
  );
}
