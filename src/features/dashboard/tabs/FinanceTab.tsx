import { Banknote, CalendarClock, Landmark, ReceiptText, RotateCcw, TrendingUp, Users, Wallet } from "lucide-react";
import { Bar as ReBar, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { Trans } from "react-i18next";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { formatCurrency } from "@/utils/format";
import { resolveDateRange } from "../dateRange";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "../chartTheme";
import { getFinanceSummary } from "./api";
import { compactInr, humanize, monthLabel, percent, share } from "./format";
import { MOCK_FINANCE } from "./mock";
import { BarList, Note, Panel, TabBody, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";
import FeeDefaultersPanel from "./FeeDefaultersPanel";

const AGEING_TONE = ["info", "warning", "warning", "danger", "danger"] as const;

export default function FinanceTab({ source, dateRange, rangeLabel }: TabProps) {
  const { t } = useTranslation("dashboard");
  const query = useTabQuery(source, "finance", dateRange, () => getFinanceSummary(resolveDateRange(dateRange)), () => MOCK_FINANCE);
  return (
    <TabBody query={query} skeletonCards={4}>
      {(d) => {
        const monthPct = share(d.collectedThisMonth, d.expectedThisMonth);
        const owingTotal = d.ageing.reduce((s, b) => s + b.amount, 0);
        const modeTotal = d.paymentModes.reduce((s, m) => s + m.amount, 0);
        const chart = d.months.map((m) => ({ ...m, label: monthLabel(m.month, t) }));
        const hasPayroll = d.payrollCostInRange !== null;
        return (
          <div className="space-y-5">
            <StatGrid columns={4}>
              <StatCard label={t("Collected today")} icon={Wallet} tone="success" value={compactInr(d.collectedToday)} hint={d.paymentsToday === 1 ? t("{{count}} payment", { count: d.paymentsToday }) : t("{{count}} payments", { count: d.paymentsToday })} />
              <StatCard
                label={t("This month vs target")}
                icon={TrendingUp}
                tone={monthPct >= 80 ? "success" : monthPct >= 50 ? "warning" : "danger"}
                value={`${monthPct}%`}
                hint={t("{{collected}} of {{expected}} falling due", { collected: compactInr(d.collectedThisMonth), expected: compactInr(d.expectedThisMonth) })}
              />
              <StatCard
                label={t("Outstanding")}
                icon={CalendarClock}
                tone={d.outstanding > 0 ? "warning" : "success"}
                value={compactInr(d.outstanding)}
                hint={
                  d.defaulterStudents === 1
                    ? t("{{count}} student past due · {{amount}}", { count: d.defaulterStudents, amount: compactInr(d.defaulterAmount) })
                    : t("{{count}} students past due · {{amount}}", { count: d.defaulterStudents, amount: compactInr(d.defaulterAmount) })
                }
              />
              <StatCard
                label={t("Collection rate")}
                icon={Banknote}
                tone="brand"
                value={percent(d.collectionRatePercent)}
                hint={t("{{collected}} of {{expected}} · {{range}}", { collected: compactInr(d.collectedInRange), expected: compactInr(d.expectedInRange), range: rangeLabel })}
              />
            </StatGrid>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title={hasPayroll ? t("Fee income vs payroll cost") : t("Fee collection")} description={t("Per month · {{range}}", { range: rangeLabel })} className="xl:col-span-2" href="/fees" hrefLabel={t("Fee Management")}>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                      <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={56} tickFormatter={(v: number) => compactInr(v)} />
                      <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                      <ReBar dataKey="expected" name={t("Falling due")} fill="var(--color-secondary)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      <ReBar dataKey="collected" name={t("Collected")} fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      {hasPayroll && <Line dataKey="payrollCost" name={t("Payroll cost")} type="monotone" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {hasPayroll && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    <Trans
                      t={t}
                      i18nKey="Over {{range}}: fees collected {{collected}}, payroll cost {{payroll}} — net <0>{{net}}</0>."
                      values={{
                        range: rangeLabel.toLowerCase(),
                        collected: compactInr(d.collectedInRange),
                        payroll: compactInr(d.payrollCostInRange ?? 0),
                        net: compactInr(d.collectedInRange - (d.payrollCostInRange ?? 0)),
                      }}
                      components={[
                        <span className={d.collectedInRange - (d.payrollCostInRange ?? 0) >= 0 ? "font-medium text-success-strong" : "font-medium text-destructive-strong"} />,
                      ]}
                    />
                  </p>
                )}
              </Panel>

              <Panel title={t("Dues by age")} description={t("Money still owed, by how late it is")} href="/fees" hrefLabel={t("Invoices")}>
                <BarList
                  items={d.ageing.map((b, i) => ({
                    key: b.label,
                    label: t(b.label),
                    value: b.amount,
                    display: `${compactInr(b.amount)} · ${b.invoices}`,
                    tone: AGEING_TONE[i] ?? "neutral",
                    sub: owingTotal > 0 && i > 0 && b.amount > 0 ? t("{{percent}}% of what is owed", { percent: share(b.amount, owingTotal) }) : undefined,
                  }))}
                  empty={t("Nothing is owed.")}
                />
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <FeeDefaultersPanel source={source} dateRange={dateRange} />

              <Panel title={t("How people paid")} description={rangeLabel} href="/fees" hrefLabel={t("Receipts")}>
                <BarList
                  items={d.paymentModes.map((m) => ({
                    key: m.mode,
                    label: t(humanize(m.mode)),
                    value: m.amount,
                    display: `${compactInr(m.amount)} · ${share(m.amount, modeTotal)}%`,
                    sub: m.receipts === 1 ? t("{{count}} receipt", { count: m.receipts }) : t("{{count}} receipts", { count: m.receipts }),
                  }))}
                  empty={t("No payments in this period.")}
                />
              </Panel>

              <Panel title={t("Refunds & payroll")} description={t("What needs a decision")} href="/payroll" hrefLabel={t("Payroll")}>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <RotateCcw className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>
                      <Trans
                        t={t}
                        i18nKey={d.refundsPending === 1 ? "<0>{{count}}</0> refund pending ({{amount}})." : "<0>{{count}}</0> refunds pending ({{amount}})."}
                        values={{ count: d.refundsPending, amount: compactInr(d.refundsPendingAmount) }}
                        components={[<span className="font-semibold tabular-nums" />]}
                      />{" "}
                      <span className="text-muted-foreground">{t("{{amount}} refunded in this period.", { amount: compactInr(d.refundsProcessedInRange) })}</span>
                    </span>
                  </li>
                  {d.payslipsUnpaid !== null ? (
                    <li className="flex items-start gap-3">
                      <ReceiptText className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>
                        <Trans
                          t={t}
                          i18nKey={d.payslipsUnpaid === 1 ? "<0>{{count}}</0> payslip not yet paid ({{amount}})." : "<0>{{count}}</0> payslips not yet paid ({{amount}})."}
                          values={{ count: d.payslipsUnpaid, amount: compactInr(d.payslipsUnpaidAmount ?? 0) }}
                          components={[<span className="font-semibold tabular-nums" />]}
                        />
                      </span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-3 text-muted-foreground">
                      <Landmark className="mt-0.5 h-4 w-4" aria-hidden="true" />
                      <span>{t("Payroll figures are shown to administrators and people with Payroll access.")}</span>
                    </li>
                  )}
                  <li className="flex items-start gap-3 text-muted-foreground">
                    <Users className="mt-0.5 h-4 w-4" aria-hidden="true" />
                    <span>{t("Cash, card, online and cheque are the payment modes receipts record; bank balances live in Accounting.")}</span>
                  </li>
                </ul>
              </Panel>
            </div>
            {d.expectedInRange === 0 && <Note>{t("No invoices fall due in this period, so the collection rate is not available.")}</Note>}
          </div>
        );
      }}
    </TabBody>
  );
}

