import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AUDIT_CATEGORY_CONFIG } from "../constants";
import { listAuditLog } from "../api";
import type { AuditCategory } from "../types";

const ALL = "__all__";

export default function AuditLogTab() {
  const [category, setCategory] = useState<string>(ALL);
  const { data: entries = [], isLoading } = useQuery({ queryKey: ["settings", "audit-log"], queryFn: listAuditLog });

  const filtered = useMemo(() => (category === ALL ? entries : entries.filter((e) => e.category === category)), [entries, category]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">A running record of administrative and system actions.</p>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {(Object.keys(AUDIT_CATEGORY_CONFIG) as AuditCategory[]).map((c) => (
              <SelectItem key={c} value={c}>
                {AUDIT_CATEGORY_CONFIG[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading && <p className="px-4 py-8 text-sm text-muted-foreground text-center">Loading…</p>}
        {!isLoading && filtered.length === 0 && <p className="px-4 py-8 text-sm text-muted-foreground text-center">No matching entries.</p>}
        <div className="divide-y divide-border">
          {filtered.map((entry) => {
            const config = AUDIT_CATEGORY_CONFIG[entry.category];
            return (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-foreground">{entry.actor}</span> {entry.action}
                    {entry.detail && <span className="text-muted-foreground"> — {entry.detail}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
