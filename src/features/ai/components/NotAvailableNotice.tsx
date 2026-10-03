import { Info } from "lucide-react";

/** Shown where a role may use an AI feature but the configured AI provider cannot run it. */
export default function NotAvailableNotice({ what }: { what: string }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {what} isn&apos;t available with this school&apos;s current AI setup. An administrator can enable it by configuring an AI provider.
    </div>
  );
}
