import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

export default function MultiSelectList({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder = "Search…",
  emptyMessage = "No options available.",
}: {
  label?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, search]);

  const selectedSet = new Set(selected);
  const toggle = (id: string) => {
    onChange(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} className="pl-8 h-8 text-sm" />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {filtered.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">{emptyMessage}</p>}
        {filtered.map((option) => (
          <label key={option.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/40">
            <Checkbox checked={selectedSet.has(option.id)} onCheckedChange={() => toggle(option.id)} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground truncate">{option.label}</span>
              {option.sublabel && <span className="block text-xs text-muted-foreground truncate">{option.sublabel}</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
