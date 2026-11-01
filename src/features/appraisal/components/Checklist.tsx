import { Checkbox } from "@/components/ui/checkbox";
import type { Option } from "../shared";

/** A set of labelled checkboxes for choosing several values (employee categories, reviewer groups, departments). */
export default function Checklist({ items, value, onChange, "aria-label": ariaLabel, columns = 2 }: { items: Option[]; value: string[]; onChange: (next: string[]) => void; "aria-label"?: string; columns?: 1 | 2 | 3 }) {
  const toggle = (v: string, on: boolean) => onChange(on ? [...value, v] : value.filter((x) => x !== v));
  return (
    <div role="group" aria-label={ariaLabel} className={columns === 1 ? "grid gap-1.5" : columns === 3 ? "grid gap-1.5 sm:grid-cols-3" : "grid gap-1.5 sm:grid-cols-2"}>
      {items.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={value.includes(o.value)} onCheckedChange={(c) => toggle(o.value, c === true)} aria-label={o.label} />
          <span className="min-w-0">{o.label}</span>
        </label>
      ))}
    </div>
  );
}
