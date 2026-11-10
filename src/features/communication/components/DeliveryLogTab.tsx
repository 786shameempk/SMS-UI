import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ErrorState } from "@/components/ui/states";
import { formatCurrency } from "@/utils/format";
import { CHANNELS } from "../constants";
import { exportHistory, searchHistory, type HistoryFilter } from "../messaging/platformApi";
import type { Channel, DeliveryStatus } from "../types";

const STATUSES: DeliveryStatus[] = ["queued", "sending", "sent", "delivered", "read", "failed", "bounced", "skipped", "standby"];
const TONE: Record<DeliveryStatus, "neutral" | "info" | "success" | "danger" | "warning"> = {
  queued: "info", sending: "info", sent: "info", delivered: "success", read: "success", failed: "danger", bounced: "danger", skipped: "neutral", standby: "neutral",
};
const PAGE_SIZE = 25;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Every delivery across all messages and events, filtered by date, channel, status, event and recipient; exportable and printable. */
export default function DeliveryLogTab() {
  const { t } = useTranslation("communication");
  const [filter, setFilter] = useState<HistoryFilter>({ from: isoDay(new Date(Date.now() - 6 * 86_400_000)), to: isoDay(new Date()) });
  const [page, setPage] = useState(1);
  const set = (patch: Partial<HistoryFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const history = useQuery({
    queryKey: ["communication", "history", filter, page],
    queryFn: () => searchHistory({ ...filter, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const download = useMutation({
    mutationFn: () => exportHistory(filter),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "notification-history.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = history.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (history.isError) return <ErrorState onRetry={() => history.refetch()} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        <Input type="date" className="w-auto" value={filter.from ?? ""} onChange={(e) => set({ from: e.target.value })} aria-label={t("From")} />
        <Input type="date" className="w-auto" value={filter.to ?? ""} onChange={(e) => set({ to: e.target.value })} aria-label={t("To")} />
        <NativeSelect className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={filter.channel ?? ""} onChange={(e) => set({ channel: (e.target.value || undefined) as Channel | undefined })} aria-label={t("Channel")}>
          <option value="">{t("All channels")}</option>
          {CHANNELS.filter((c) => c.value !== "push" && c.value !== "in-app").map((c) => (
            <option key={c.value} value={c.value}>
              {t(c.label)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={filter.status ?? ""} onChange={(e) => set({ status: (e.target.value || undefined) as DeliveryStatus | undefined })} aria-label={t("Status")}>
          <option value="">{t("All statuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(s.charAt(0).toUpperCase() + s.slice(1))}
            </option>
          ))}
        </NativeSelect>
        <Input className="w-40" placeholder={t("Event, e.g. fee.reminder")} value={filter.eventType ?? ""} onChange={(e) => set({ eventType: e.target.value })} aria-label={t("Event")} />
        <Input className="w-48" placeholder={t("Recipient name, phone or email")} value={filter.recipient ?? ""} onChange={(e) => set({ recipient: e.target.value })} aria-label={t("Recipient")} />
        <Button variant="outline" onClick={() => download.mutate()} loading={download.isPending}>
          <Download className="h-4 w-4" /> {t("Export CSV")}
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> {t("Print")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {!history.data?.items.length ? (
            <p className="text-sm text-muted-foreground">{history.isLoading ? t("Loading…") : t("No deliveries match these filters.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-start text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pe-3">{t("When")}</th>
                    <th className="py-2 pe-3">{t("Event")}</th>
                    <th className="py-2 pe-3">{t("Recipient")}</th>
                    <th className="py-2 pe-3">{t("Channel")}</th>
                    <th className="py-2 pe-3">{t("Status")}</th>
                    <th className="py-2 pe-3">{t("Provider")}</th>
                    <th className="py-2 pe-3 text-end">{t("Tries")}</th>
                    <th className="py-2 text-end">{t("Cost")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pe-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="py-2 pe-3">
                        <span className="font-mono text-xs">{r.eventType ?? t("Broadcast")}</span>
                        {r.templateName && <div className="text-xs text-muted-foreground">{r.templateName}</div>}
                      </td>
                      <td className="py-2 pe-3">
                        {r.recipientName ?? "—"}
                        <div className="text-xs text-muted-foreground">{r.address ?? ""}</div>
                      </td>
                      <td className="py-2 pe-3">
                        {CHANNELS.find((c) => c.value === r.channel)?.label ?? r.channel}
                        {r.fallbackOrder > 0 && <span className="ms-1 text-xs text-muted-foreground">({t("fallback")})</span>}
                      </td>
                      <td className="py-2 pe-3">
                        <Badge variant={TONE[r.status]}>{t(r.status.charAt(0).toUpperCase() + r.status.slice(1))}</Badge>
                        {r.lastError && <div className="max-w-56 truncate text-xs text-muted-foreground" title={r.lastError}>{r.lastError}</div>}
                      </td>
                      <td className="py-2 pe-3">{r.provider ?? "—"}</td>
                      <td className="py-2 pe-3 text-end">{r.attemptCount}</td>
                      <td className="py-2 text-end">{r.cost == null ? "—" : formatCurrency(r.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground print:hidden">
            <span>{t("{{n}} deliveries", { n: total.toLocaleString() })}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t("Previous")}
              </Button>
              <span>{t("Page {{page}} of {{pages}}", { page, pages })}</span>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                {t("Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
