import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/utils/format";
import type { ActivityItem } from "../types";

export default function RecentActivityCard({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>What&apos;s happened across the school recently.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 pl-4 border-l border-border">
          {activity.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-brand-400 ring-4 ring-white" />
              <p className="text-sm text-foreground">
                <span className="font-semibold text-foreground">{item.actor}</span> {item.action}{" "}
                <span className="font-medium text-foreground">{item.target}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(item.createdAt)}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
