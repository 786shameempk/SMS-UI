import { History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/utils/format";
import type { ActivityItem } from "../types";

export default function RecentActivityCard({ activity }: { activity: ActivityItem[] }) {
  const { t } = useTranslation("dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Recent activity")}</CardTitle>
        <CardDescription>{t("What's happened across the school recently.")}</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 && <EmptyState bare size="sm" icon={History} title={t("No recent activity")} description={t("Changes across the school will be listed here.")} className="py-6" />}
        <ol className="relative space-y-4 ps-4 border-s border-border">
          {activity.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -start-[21px] top-1 w-2 h-2 rounded-full bg-brand-400 ring-4 ring-card" />
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
