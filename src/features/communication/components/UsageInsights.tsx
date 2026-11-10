import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/format";
import { CHANNELS } from "../constants";
import { getAnalytics, getMonthlyUsage, getPlatformUsage } from "../messaging/platformApi";

const channelLabel = (c: string) => CHANNELS.find((x) => x.value === c)?.label ?? c;

/** This month against the quota: WhatsApp split by category, overage and the estimated bill. */
export function MonthlyUsageCard() {
  const { t } = useTranslation("communication");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const usage = useQuery({ queryKey: ["communication", "usage-monthly", month], queryFn: () => getMonthlyUsage(month), enabled: /^\d{4}-\d{2}$/.test(month) });
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("Monthly usage and quota")}</CardTitle>
        <Input type="month" className="w-auto" value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t("Month")} />
      </CardHeader>
      <CardContent>
        {!usage.data?.rows.length ? (
          <p className="text-sm text-muted-foreground">{usage.isLoading ? t("Loading…") : t("No messages this month.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3">{t("Channel")}</th>
                  <th className="py-2 pe-3">{t("Category")}</th>
                  <th className="py-2 pe-3 text-end">{t("Sent")}</th>
                  <th className="py-2 pe-3 text-end">{t("Delivered")}</th>
                  <th className="py-2 pe-3 text-end">{t("Failed")}</th>
                  <th className="py-2 pe-3 text-end">{t("Quota")}</th>
                  <th className="py-2 pe-3 text-end">{t("Overage")}</th>
                  <th className="py-2 text-end">{t("Est. cost")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usage.data.rows.map((r) => (
                  <tr key={`${r.channel}-${r.category}`}>
                    <td className="py-2 pe-3">{channelLabel(r.channel)}</td>
                    <td className="py-2 pe-3 capitalize">{r.category ?? "—"}</td>
                    <td className="py-2 pe-3 text-end">{r.attempted}</td>
                    <td className="py-2 pe-3 text-end">{r.delivered}</td>
                    <td className="py-2 pe-3 text-end">{r.failed}</td>
                    <td className="py-2 pe-3 text-end">
                      {r.quota == null ? "—" : `${r.quota.toLocaleString()} (${r.percentUsed}%)`}
                      {r.alertRaised && <Badge variant="warning" className="ms-1">{t("Alert sent")}</Badge>}
                    </td>
                    <td className={`py-2 pe-3 text-end ${r.overage > 0 ? "font-medium text-destructive-strong" : ""}`}>{r.overage}</td>
                    <td className="py-2 text-end">{formatCurrency(r.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <td className="pt-2" colSpan={7}>
                    {t("Month total")}
                  </td>
                  <td className="pt-2 text-end">{formatCurrency(usage.data.totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Success rate per channel and provider, and how many deliveries failed each day. */
export function AnalyticsCard({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation("communication");
  const data = useQuery({ queryKey: ["communication", "analytics", from, to], queryFn: () => getAnalytics(from, to) });
  const worst = Math.max(1, ...(data.data?.failureTrend ?? []).map((d) => d.failed));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("Success by channel and provider")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {data.data?.channels.map((c) => (
            <div key={c.channel} className="flex justify-between">
              <span>{channelLabel(c.channel)}</span>
              <span>
                {c.successPercent}% · {c.total.toLocaleString()} {t("sent")} · {formatCurrency(c.estimatedCost)}
              </span>
            </div>
          ))}
          {!!data.data?.providers.length && <hr className="my-2 border-border" />}
          {data.data?.providers.map((p) => (
            <div key={`${p.provider}-${p.channel}`} className="flex justify-between text-muted-foreground">
              <span>{p.provider}</span>
              <span>
                {p.successPercent}% · {p.delivered}/{p.attempted}
              </span>
            </div>
          ))}
          {!data.data?.channels.length && <p className="text-muted-foreground">{data.isLoading ? t("Loading…") : t("No messages in this period.")}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("Failures per day")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-28 items-end gap-1" role="img" aria-label={t("Failures per day")}>
            {data.data?.failureTrend.map((d) => (
              <div key={d.day} className="flex-1 rounded-t bg-destructive/70" style={{ height: `${Math.max(4, (d.failed / worst) * 100)}%` }} title={`${d.day}: ${d.failed} / ${d.total}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Schools side by side. Only the platform administrator's request is answered; others see nothing here. */
export function PlatformUsageCard({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation("communication");
  const rows = useQuery({ queryKey: ["communication", "platform-usage", from, to], queryFn: () => getPlatformUsage(from, to) });
  if (!rows.data?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("All schools")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-start text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pe-3">{t("School")}</th>
              <th className="py-2 pe-3 text-end">{t("Messages")}</th>
              <th className="py-2 pe-3 text-end">{t("Delivered")}</th>
              <th className="py-2 pe-3 text-end">{t("Failed")}</th>
              <th className="py-2 pe-3 text-end">{t("Success")}</th>
              <th className="py-2 text-end">{t("Est. cost")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.data.map((r) => (
              <tr key={r.tenantId}>
                <td className="py-2 pe-3 font-mono text-xs">{r.tenantId}</td>
                <td className="py-2 pe-3 text-end">{r.total}</td>
                <td className="py-2 pe-3 text-end">{r.delivered}</td>
                <td className="py-2 pe-3 text-end">{r.failed}</td>
                <td className="py-2 pe-3 text-end">{r.successPercent}%</td>
                <td className="py-2 text-end">{formatCurrency(r.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
