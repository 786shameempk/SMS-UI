import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { formatCurrency } from "@/utils/format";
import { CHANNELS } from "../constants";
import { getUsage } from "../messaging/api";

import { useTranslation } from "react-i18next";
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Messages attempted, delivered and failed per day and channel, with the estimated cost from each provider's configured price. */
export default function UsageTab() {
  const { t } = useTranslation("communication");
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86_400_000)));
  const usage = useQuery({ queryKey: ["communication", "usage", from, to], queryFn: () => getUsage(from, to) });

  const totals = useMemo(() => {
    const rows = usage.data ?? [];
    return {
      attempted: rows.reduce((n, r) => n + r.attempted, 0),
      delivered: rows.reduce((n, r) => n + r.delivered, 0),
      failed: rows.reduce((n, r) => n + r.failed, 0),
      cost: rows.reduce((n, r) => n + r.estimatedCost, 0),
    };
  }, [usage.data]);

  if (usage.isError) return <ErrorState onRetry={() => usage.refetch()} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input type="date" className="w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("From")} />
        <Input type="date" className="w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("To")} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("Messages attempted")} value={totals.attempted} />
        <StatCard label={t("Delivered (receipt)")} value={totals.delivered} />
        <StatCard label={t("Failed or bounced")} value={totals.failed} />
        <StatCard label={t("Estimated cost")} value={formatCurrency(totals.cost)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("By day")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!usage.data?.length ? (
            <p className="text-sm text-muted-foreground">{usage.isLoading ? t("Loading…") : t("No messages in this period.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-start text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pe-3">{t("Day")}</th>
                    <th className="py-2 pe-3">{t("Channel")}</th>
                    <th className="py-2 pe-3">{t("Provider")}</th>
                    <th className="py-2 pe-3 text-end">{t("Attempted")}</th>
                    <th className="py-2 pe-3 text-end">{t("Delivered")}</th>
                    <th className="py-2 pe-3 text-end">{t("Failed")}</th>
                    <th className="py-2 pe-3 text-end">{t("Skipped")}</th>
                    <th className="py-2 text-end">{t("Est. cost")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usage.data.map((r) => (
                    <tr key={`${r.day}-${r.channel}-${r.provider}`}>
                      <td className="py-2 pe-3">{r.day}</td>
                      <td className="py-2 pe-3">{CHANNELS.find((c) => c.value === r.channel)?.label ?? r.channel}</td>
                      <td className="py-2 pe-3">{r.provider ?? "—"}</td>
                      <td className="py-2 pe-3 text-end">{r.attempted}</td>
                      <td className="py-2 pe-3 text-end">{r.delivered}</td>
                      <td className="py-2 pe-3 text-end">{r.failed}</td>
                      <td className="py-2 pe-3 text-end">{r.skipped}</td>
                      <td className="py-2 text-end">{formatCurrency(r.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
