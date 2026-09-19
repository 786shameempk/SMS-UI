import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { JOURNAL_STATUS_CONFIG } from "../constants";
import type { Account, JournalEntry } from "../types";

export default function JournalEntryDetailDialog({
  open,
  onOpenChange,
  entry,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: JournalEntry | null;
  accounts: Account[];
}) {
  if (!entry) return null;
  const accountById = new Map(accounts.map((a) => [a.id, a] as const));
  const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
  const config = JOURNAL_STATUS_CONFIG[entry.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{entry.entryNumber}</DialogTitle>
            <Badge variant={config.variant}>{config.label}</Badge>
            {entry.gstApplicable && <Badge variant="info">GST</Badge>}
          </div>
          <DialogDescription>{entry.narration}</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Date</dt>
            <dd className="text-slate-800 font-medium">{formatDateTime(entry.date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Reference</dt>
            <dd className="text-slate-800 font-medium">{entry.reference || "—"}</dd>
          </div>
        </dl>

        <div className="space-y-1.5">
          {entry.lines.map((line) => {
            const account = accountById.get(line.accountId);
            return (
              <div key={line.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {account ? `${account.code} · ${account.name}` : "Unknown account"}
                  </p>
                  {line.description && <p className="text-xs text-slate-500 truncate">{line.description}</p>}
                </div>
                <div className="text-right shrink-0 text-sm tabular-nums">
                  {line.debit > 0 && <p className="text-slate-800">{formatCurrency(line.debit)}</p>}
                  {line.credit > 0 && <p className="text-slate-500">{formatCurrency(line.credit)}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-medium">
          <span className="text-slate-600">Total</span>
          <span className="tabular-nums">
            Dr {formatCurrency(totalDebit)} &middot; Cr {formatCurrency(totalCredit)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
