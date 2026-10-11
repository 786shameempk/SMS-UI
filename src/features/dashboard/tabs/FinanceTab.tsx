import { Banknote, CalendarClock, Landmark, ReceiptText, RotateCcw, TrendingUp, Users, Wallet } from "lucide-react";
import { Bar as ReBar, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const query = useTabQuery(source, "finance", dateRange, () => getFinanceSummary(resolveDateRange(dateRange)), () => MOCK_FINANCE);
  return (
    <TabBody query={query} skeletonCards={4}>
      {(d) => {
        const monthPct = share(d.collectedThisMonth, d.expectedThisMonth);
        const owingTotal = d.ageing.reduce((s, b) => s + b.amount, 0);
        const modeTotal = d.paymentModes.reduce((s, m) => s + m.amount, 0);
        const chart = d.months.map((m) => ({ ...m, label: monthLabel(m.month) }));
        const hasPayroll = d.payrollCostInRange !== null;
        return (
          <div className="space-y-5">
            <StatGrid columns={4}>
              <StatCard label="Collected today" icon={Wallet} tone="success" value={compactInr(d.collectedToday)} hint={`${d.paymentsToday} payment${d.paymentsToday === 1 ? "" : "s"}`} />
              <StatCard
                label="This month vs target"
                icon={TrendingUp}
                tone={monthPct >= 80 ? "success" : monthPct >= 50 ? "warning" : "danger"}
                value={`${monthPct}%`}
                hint={`${compactInr(d.collectedThisMonth)} of ${compactInr(d.expectedThisMonth)} falling due`}
              />
              <StatCard
                label="Outstanding"
                icon={CalendarClock}
                tone={d.outstanding > 0 ? "warning" : "success"}
                value={compactInr(d.outstanding)}
                hint={`${d.defaulterStudents} student${d.defaulterStudents === 1 ? "" : "s"} past due · ${compactInr(d.defaulterAmount)}`}
              />
              <StatCard
                label="Collection rate"
                icon={Banknote}
                tone="brand"
                value={percent(d.collectionRatePercent)}
                hint={`${compactInr(d.collectedInRange)} of ${compactInr(d.expectedInRange)} · ${rangeLabel}`}
              />
            </StatGrid>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title={hasPayroll ? "Fee income vs payroll cost" : "Fee collection"} description={`Per month · ${rangeLabel}`} className="xl:col-span-2" href="/fees" hrefLabel="Fee Management">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid {...CHART_GRID} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                      <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={56} tickFormatter={(v: number) => compactInr(v)} />
                      <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                      <ReBar dataKey="expected" name="Falling due" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      <ReBar dataKey="collected" name="Collected" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      {hasPayroll && <Line dataKey="payrollCost" name="Payroll cost" type="monotone" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {hasPayroll && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Over {rangeLabel.toLowerCase()}: fees collected {compactInr(d.collectedInRange)}, payroll cost {compactInr(d.payrollCostInRange ?? 0)} — net{" "}
                    <span className={d.collectedInRange - (d.payrollCostInRange ?? 0) >= 0 ? "font-medium text-success-strong" : "font-medium text-destructive-strong"}>
                      {compactInr(d.collectedInRange - (d.payrollCostInRange ?? 0))}
                    </span>
                    .
                  </p>
                )}
              </Panel>

              <Panel title="Dues by age" description="Money still owed, by how late it is" href="/fees" hrefLabel="Invoices">
                <BarList
                  items={d.ageing.map((b, i) => ({
                    key: b.label,
                    label: b.label,
                    value: b.amount,
                    display: `${compactInr(b.amount)} · ${b.invoices}`,
                    tone: AGEING_TONE[i] ?? "neutral",
                    sub: owingTotal > 0 && i > 0 && b.amount > 0 ? `${share(b.amount, owingTotal)}% of what is owed` : undefined,
                  }))}
                  empty="Nothing is owed."
                />
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <FeeDefaultersPanel source={source} dateRange={dateRange} />

              <Panel title="How people paid" description={rangeLabel} href="/fees" hrefLabel="Receipts">
                <BarList
                  items={d.paymentModes.map((m) => ({
                    key: m.mode,
                    label: humanize(m.mode),
                    value: m.amount,
                    display: `${compactInr(m.amount)} · ${share(m.amount, modeTotal)}%`,
                    sub: `${m.receipts} receipt${m.receipts === 1 ? "" : "s"}`,
                  }))}
                  empty="No payments in this period."
                />
              </Panel>

              <Panel title="Refunds & payroll" description="What needs a decision" href="/payroll" hrefLabel="Payroll">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <RotateCcw className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>
                      <span className="font-semibold tabular-nums">{d.refundsPending}</span> refund{d.refundsPending === 1 ? "" : "s"} pending ({compactInr(d.refundsPendingAmount)}).{" "}
                      <span className="text-muted-foreground">{compactInr(d.refundsProcessedInRange)} refunded in this period.</span>
                    </span>
                  </li>
                  {d.payslipsUnpaid !== null ? (
                    <li className="flex items-start gap-3">
                      <ReceiptText className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>
                        <span className="font-semibold tabular-nums">{d.payslipsUnpaid}</span> payslip{d.payslipsUnpaid === 1 ? "" : "s"} not yet paid ({compactInr(d.payslipsUnpaidAmount ?? 0)}).
                      </span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-3 text-muted-foreground">
                      <Landmark className="mt-0.5 h-4 w-4" aria-hidden="true" />
                      <span>Payroll figures are shown to administrators and people with Payroll access.</span>
                    </li>
                  )}
                  <li className="flex items-start gap-3 text-muted-foreground">
                    <Users className="mt-0.5 h-4 w-4" aria-hidden="true" />
                    <span>Cash, card, online and cheque are the payment modes receipts record; bank balances live in Accounting.</span>
                  </li>
                </ul>
              </Panel>
            </div>
            {d.expectedInRange === 0 && <Note>No invoices fall due in this period, so the collection rate is not available.</Note>}
          </div>
        );
      }}
    </TabBody>
  );
}

