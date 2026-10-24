import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Send, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { CHANNELS, MESSAGE_STATUS_CONFIG } from "../constants";
import { cancelScheduledMessage, listMessages, sendScheduledNow } from "../api";
import type { BroadcastMessage } from "../types";
import MessageDetailDialog from "./MessageDetailDialog";
import { RowActions } from "@/components/ui/row-actions";

import { useTranslation } from "react-i18next";
export default function HistoryTab() {
  const { t } = useTranslation("communication");
  const queryClient = useQueryClient();
  const [detailTarget, setDetailTarget] = useState<BroadcastMessage | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<BroadcastMessage | null>(null);

  const { data: messages = [], isLoading, isError, refetch } = useQuery({ queryKey: ["communication", "messages"], queryFn: listMessages });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["communication"] });

  const sendNowMutation = useMutation({
    mutationFn: sendScheduledNow,
    onSuccess: (message) => {
      invalidate();
      if (message.channels.includes("in-app")) queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("Message sent"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not send message")),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelScheduledMessage,
    onSuccess: () => {
      invalidate();
      toast.success(t("Message cancelled"));
      setCancelTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not cancel message")),
  });

  const columns: ColumnDef<BroadcastMessage, unknown>[] = [
    {
      id: "subject",
      header: t("Message"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.subject || t("(no subject)")}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{row.original.body}</p>
        </div>
      ),
    },
    {
      id: "channels",
      header: t("Channels"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.channels.map((c) => (
            <Badge key={c} variant="neutral">
              {CHANNELS.find((ch) => ch.value === c)?.label ?? c}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "recipients",
      header: t("Recipients"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.recipientCount}</span>,
    },
    {
      id: "when",
      header: t("When"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.sentAt
            ? new Date(row.original.sentAt).toLocaleString()
            : row.original.scheduledAt
              ? t("Scheduled {{v1}}", { v1: new Date(row.original.scheduledAt).toLocaleString() })
              : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => {
        const config = MESSAGE_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const message = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setDetailTarget(message);
                setDetailOpen(true);
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              {t("View details")}
            </DropdownMenuItem>
            {message.status === "scheduled" && (
              <>
                <DropdownMenuItem onClick={() => sendNowMutation.mutate(message.id)}>
                  <Send className="w-3.5 h-3.5" />
                  {t("Send now")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCancelTarget(message)}>
                  <XCircle className="w-3.5 h-3.5" />
                  {t("Cancel")}
                </DropdownMenuItem>
              </>
            )}
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Sent and scheduled broadcasts.")}</p>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={messages} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No messages yet.")} pageSize={10} />

      <MessageDetailDialog
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailTarget(null);
        }}
        message={detailTarget}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title={t("Cancel scheduled message")}
        description={t("Cancel \"{{v1}}\"? It will not be sent.", { v1: cancelTarget?.subject || "this message" })}
        confirmLabel={t("Cancel message")}
        confirmVariant="destructive"
        submitting={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
        }}
      />
    </div>
  );
}
