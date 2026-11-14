import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ASSESSMENT_PRESETS, componentsTotal, validateComponents } from "../assessmentPresets";
import type { AssessmentComponentInput } from "../types";

/**
 * Edits an ordered list of assessment components: label, maximum (decimals allowed), whether it counts, is optional and shows on the
 * progress card. Rows reorder by drag and drop or the arrow buttons. Shows the live column preview and the total.
 */
export default function ComponentEditor({
  value,
  onChange,
  showPresets = true,
}: {
  value: AssessmentComponentInput[];
  onChange: (next: AssessmentComponentInput[]) => void;
  showPresets?: boolean;
}) {
  const { t } = useTranslation("examinations");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const error = validateComponents(value);
  const total = componentsTotal(value);

  const patch = (index: number, change: Partial<AssessmentComponentInput>) => onChange(value.map((x, i) => (i === index ? { ...x, ...change } : x)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {showPresets && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("Start from")}</span>
          {ASSESSMENT_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange(p.components.map((x) => ({ ...x })))}
              title={t("A starting point only. Change every label and maximum to match your own pattern.")}
            >
              {p.name}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-2" role="list" aria-label={t("Assessment components")}>
        {value.map((row, i) => (
          <div
            key={row.key ?? `new-${i}`}
            role="listitem"
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null) move(dragFrom, i);
              setDragFrom(null);
            }}
            onDragEnd={() => setDragFrom(null)}
            className={`grid grid-cols-[auto_1fr_6rem_auto] sm:grid-cols-[auto_1fr_6rem_auto_auto_auto_auto] items-center gap-2 rounded-lg border border-border p-2 ${dragFrom === i ? "opacity-50" : ""}`}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" aria-hidden />
            <Input
              aria-label={t("Component label")}
              placeholder={t("e.g. PT")}
              maxLength={30}
              value={row.label}
              onChange={(e) => patch(i, { label: e.target.value })}
            />
            <Input
              aria-label={t("Maximum marks for {{label}}", { label: row.label || i + 1 })}
              type="number"
              min={0}
              step="0.5"
              value={row.max}
              onChange={(e) => patch(i, { max: Number(e.target.value) })}
            />
            <div className="flex items-center gap-1">
              <Button type="button" size="icon" variant="ghost" aria-label={t("Move up")} disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label={t("Move down")} disabled={i === value.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>
            <label className="hidden sm:flex items-center gap-1 text-xs">
              <Checkbox checked={row.counts} onCheckedChange={(v) => patch(i, { counts: Boolean(v) })} />
              {t("Counts")}
            </label>
            <label className="hidden sm:flex items-center gap-1 text-xs">
              <Checkbox checked={row.optional} onCheckedChange={(v) => patch(i, { optional: Boolean(v) })} />
              {t("Optional")}
            </label>
            <div className="flex items-center gap-2">
              <label className="hidden sm:flex items-center gap-1 text-xs">
                <Checkbox checked={row.showOnCard} onCheckedChange={(v) => patch(i, { showOnCard: Boolean(v) })} />
                {t("On card")}
              </label>
              <Button type="button" size="icon" variant="ghost" aria-label={t("Remove component")} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={value.length >= 10}
          onClick={() => onChange([...value, { label: "", max: 10, optional: false, counts: true, showOnCard: true }])}
        >
          <Plus className="w-4 h-4" /> {t("Add component")}
        </Button>
        <p className="text-sm font-medium tabular-nums" aria-live="polite">
          {t("Total")}: {total}
        </p>
      </div>

      {/* Live preview of the mark entry columns this structure makes. */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-2 py-1 text-left">{t("Student")}</th>
              {value.map((x, i) => (
                <th key={i} className="px-2 py-1 text-right whitespace-nowrap">
                  {x.label || "—"} ({x.max || 0}){!x.counts ? "*" : ""}
                </th>
              ))}
              <th className="px-2 py-1 text-right">{t("Total")} ({total})</th>
            </tr>
          </thead>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t("* does not count towards the total. Drag a row, or use the arrows, to change the order.")}</p>
      {error && <p role="alert" className="text-xs text-destructive-strong">{t(error)}</p>}
    </div>
  );
}
