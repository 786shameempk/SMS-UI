import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatTile({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-brand-600" />
        </div>
      </CardContent>
    </Card>
  );
}
