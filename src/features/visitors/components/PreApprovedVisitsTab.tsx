import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus, LogIn, QrCode, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatDateTime } from "@/utils/format";
import { PURPOSE_CONFIG, PRE_APPROVAL_STATUS_CONFIG } from "../constants";
import { cancelPreApprovedVisit, checkInFromPreApproval, createPreApprovedVisit, deletePreApprovedVisit, listPreApprovedVisits } from "../api";
import type { PreApprovedVisitRow } from "../types";
import PassQrDialog, { type PassQrSubject } from "./PassQrDialog";
import PreApprovedVisitFormDialog from "./PreApprovedVisitFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function PreApprovedVisitsTab() {
  const { t } = useTranslation("visitors");
  const queryClient = useQueryClient();
  const { data: visits = [], isLoading, isError, refetch } = useQuery({ queryKey: ["visitors", "preapprovals"], queryFn: () => listPreApprovedVisits() });
  const [formOpen, setFormOpen] = useState(false);
  const [pass, setPass] = useState<PassQrSubject | null>(null);
  const showPass = (v: { visitorName: string; passToken?: string; scheduledAt: string; passExpiresAt?: string }) => {
    if (v.passToken) setPass({ kind: "invitation", visitorName: v.visitorName, token: v.passToken, at: v.scheduledAt, expiresAt: v.passExpiresAt });
  };
  const [deleteTarget, setDeleteTarget] = useState<PreApprovedVisitRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["visitors", "preapprovals"] });
    queryClient.invalidateQueries({ queryKey: ["visitors", "entries"] });
    queryClient.invalidateQueries({ queryKey: ["visitors", "reports"] });
  };

  const createMutation = useMutation({
    mutationFn: createPreApprovedVisit,
    onSuccess: (visit) => {
      invalidate();
      toast.success(t("Visit scheduled"));
      setFormOpen(false);
      showPass(visit);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not schedule visit")),
  });

  const checkInMutation = useMutation({
    mutationFn: checkInFromPreApproval,
    onSuccess: (entry) => {
      invalidate();
      toast.success(t("{{name}} checked in — badge {{badge}}", { name: entry.visitorName, badge: entry.badgeNumber }));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not check in visitor")),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPreApprovedVisit,
    onSuccess: () => {
      invalidate();
      toast.success(t("Visit cancelled"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not cancel visit")),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePreApprovedVisit,
    onSuccess: () => {
      invalidate();
      toast.success(t("Pre-approval deleted"));
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<PreApprovedVisitRow, unknown>[] = [
    {
      id: "visitor",
      header: t("Visitor"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.visitorName}</p>
          <p className="text-xs text-muted-foreground">{row.original.phone}</p>
        </div>
      ),
    },
    {
      id: "purpose",
      header: t("Purpose"),
      cell: ({ row }) => <span className="text-sm text-foreground">{t(PURPOSE_CONFIG[row.original.purpose].label)}</span>,
    },
    {
      id: "host",
      header: t("Here to see"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.hostLabel}</span>,
    },
    {
      accessorKey: "scheduledAt",
      header: t("Scheduled for"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{formatDateTime(row.original.scheduledAt)}</span>,
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => <Badge variant={PRE_APPROVAL_STATUS_CONFIG[row.original.status].variant}>{t(PRE_APPROVAL_STATUS_CONFIG[row.original.status].label)}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const v = row.original;
        return (
          <RowActions>
            {v.status === "scheduled" && (
              <>
                {v.passToken && (
                  <DropdownMenuItem onClick={() => showPass(v)}>
                    <QrCode className="w-3.5 h-3.5" />
                    {t("QR pass")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => checkInMutation.mutate(v.id)}>
                  <LogIn className="w-3.5 h-3.5" />
                  {t("Check in now")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => cancelMutation.mutate(v.id)}>
                  <XCircle className="w-3.5 h-3.5" />
                  {t("Cancel")}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => setDeleteTarget(v)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Appointments scheduled in advance — check them in on arrival.")}</p>
        <Button onClick={() => setFormOpen(true)}>
          <CalendarPlus className="w-4 h-4" />
          {t("Schedule visit")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={visits} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No pre-approved visits scheduled.")} pageSize={10} />

      <PreApprovedVisitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <PassQrDialog subject={pass} onClose={() => setPass(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete pre-approval")}
        description={t("Delete the scheduled visit for {{name}}? This cannot be undone.", { name: deleteTarget?.visitorName })}
        confirmLabel={t("Delete")}
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
