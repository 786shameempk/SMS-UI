import { Cake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeDay } from "@/utils/format";
import type { BirthdayItem } from "../types";

export default function BirthdaysCard({ birthdays }: { birthdays: BirthdayItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="w-4 h-4 text-muted-foreground" />
          Birthdays
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {birthdays.length === 0 && <p className="text-sm text-muted-foreground">No birthdays this week.</p>}
        {birthdays.map((b) => (
          <div key={b.id} className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-[10px]">{b.avatarInitials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{b.role}</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground shrink-0">{formatRelativeDay(b.date)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
