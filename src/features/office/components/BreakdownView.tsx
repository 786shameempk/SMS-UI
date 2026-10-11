import { StatusBadge } from "./salesKit";
import { money } from "../helpers";
import type { QuoteBreakdown } from "../types";

/** A server-priced quotation, laid out the way it will be invoiced. */
export function BreakdownView({ breakdown: b }: { breakdown: QuoteBreakdown }) {
  const c = b.currency;
  return (
    <div className="space-y-3 text-sm">
      <table className="w-full">
        <tbody>
          {b.lines.map((l) => (
            <tr key={`${l.code}-${l.description}`} className="align-top">
              <td className="py-1 pr-2">{l.description}{l.recurring && b.cycles > 1 ? <span className="text-xs text-muted-foreground"> × {l.cycles}</span> : null}</td>
              <td className="py-1 text-right tabular-nums">{money(l.amount, c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="space-y-1 border-t border-border pt-2">
        <Row label="Subtotal" value={money(b.subtotal, c)} />
        {b.discountAmount > 0 && <Row label={`Discount (${b.discountPercent.toFixed(1)}%)`} value={`− ${money(b.discountAmount, c)}`} />}
        <Row label={`Tax (${b.taxRatePercent}%)`} value={money(b.taxAmount, c)} />
        <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(b.total, c)}</dd>
        </div>
        <Row label={`Renews at (${b.billingFrequency.toLowerCase()})`} value={money(b.renewalAmount, c)} />
      </dl>
      {b.requiresHighDiscountApproval && <StatusBadge status="High">High discount: needs senior approval</StatusBadge>}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment schedule</p>
        <ul className="space-y-0.5">
          {b.schedule.map((s) => (
            <li key={s.label} className="flex justify-between">
              <span>{s.label} <span className="text-xs text-muted-foreground">({s.percent}% · day {s.dueInDays})</span></span>
              <span className="tabular-nums">{money(s.amount, c)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Includes</p>
        <p>{b.entitlements.modules.join(", ")}</p>
        <p className="text-xs text-muted-foreground">
          Up to {b.entitlements.maxStudents} students · {b.entitlements.maxBranches} branch{b.entitlements.maxBranches === 1 ? "" : "es"} · {b.entitlements.maxUsers} users · {b.entitlements.storageGb} GB
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
