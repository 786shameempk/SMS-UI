import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Eye, FilePlus2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatRelativeDay } from "@/utils/format";
import { CERTIFICATE_TYPE_CONFIG, CERTIFICATE_TYPE_OPTIONS } from "../constants";
import { deleteIssuedCertificate, listIssuedCertificates, reissueCertificate, revokeCertificate } from "../api";
import { useIssuingSchoolName } from "../verifyUrl";
import CertificateStatusBadge from "./CertificateStatusBadge";
import type { IssuedCertificate } from "../types";
import CertificateView from "./CertificateView";
import { RowActions } from "@/components/ui/row-actions";

export default function IssuedCertificatesTab() {
  const { t } = useTranslation("certificates");
  const queryClient = useQueryClient();
  useIssuingSchoolName();
  const { data: certificates = [], isLoading, isError, refetch } = useQuery({ queryKey: ["certificates"], queryFn: listIssuedCertificates });

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<IssuedCertificate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IssuedCertificate | null>(null);

  const [action, setAction] = useState<{ kind: "revoke" | "reissue"; certificate: IssuedCertificate } | null>(null);
  const [reason, setReason] = useState("");
  const closeAction = () => {
    setAction(null);
    setReason("");
  };
  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!action) throw new Error("Nothing selected");
      return action.kind === "revoke" ? revokeCertificate(action.certificate.id, reason.trim()) : reissueCertificate(action.certificate.id, { reason: reason.trim() });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success(action?.kind === "revoke" ? t("{{number}} revoked", { number: result.certificateNumber }) : t("Reissued as {{number}}", { number: result.certificateNumber }));
      closeAction();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update certificate")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIssuedCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success(t("{{number}} removed", { number: deleteTarget?.certificateNumber }));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not delete certificate")),
  });

  const filtered = useMemo(
    () => (typeFilter === "all" ? certificates : certificates.filter((c) => c.type === typeFilter)),
    [certificates, typeFilter],
  );

  const columns: ColumnDef<IssuedCertificate, unknown>[] = [
    {
      accessorKey: "certificateNumber",
      header: t("Certificate #"),
      cell: ({ row }) => (
        <button type="button" onClick={() => setViewing(row.original)} className="text-start cursor-pointer group">
          <p className="text-sm font-medium text-foreground group-hover:text-primary-text transition-colors">{row.original.certificateNumber}</p>
          <p className="text-xs text-muted-foreground">{formatRelativeDay(row.original.issuedOn)}</p>
        </button>
      ),
    },
    {
      id: "type",
      header: t("Type"),
      cell: ({ row }) => <Badge variant="info">{t(CERTIFICATE_TYPE_CONFIG[row.original.type].label)}</Badge>,
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => <CertificateStatusBadge status={row.original.status} />,
    },
    {
      id: "recipient",
      header: t("Recipient"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground">{row.original.recipientName}</p>
          <p className="text-xs text-muted-foreground">{row.original.recipientSubtitle}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const cert = row.original;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => setViewing(cert)}>
              <Eye className="w-3.5 h-3.5" />
              {t("View / print")}
            </DropdownMenuItem>
            {cert.status === "valid" && (
              <DropdownMenuItem onClick={() => setAction({ kind: "revoke", certificate: cert })}>
                <Ban className="w-3.5 h-3.5" />
                {t("Revoke")}
              </DropdownMenuItem>
            )}
            {cert.status !== "superseded" && (
              <DropdownMenuItem onClick={() => setAction({ kind: "reissue", certificate: cert })}>
                <FilePlus2 className="w-3.5 h-3.5" />
                {t("Reissue")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteTarget(cert)} variant="destructive">
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t("Type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All types")}</SelectItem>
            {CERTIFICATE_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.type} value={o.type}>
                {t(o.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No certificates issued yet.")} pageSize={10} />

      <CertificateView open={Boolean(viewing)} onOpenChange={(v) => !v && setViewing(null)} certificate={viewing} />

      <Dialog open={Boolean(action)} onOpenChange={(v) => !v && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action?.kind === "revoke" ? t("Revoke certificate") : t("Reissue certificate")}</DialogTitle>
            <DialogDescription>
              {action?.kind === "revoke"
                ? t("Anyone who scans the QR code on {{number}} will be told it is no longer valid.", { number: action?.certificate.certificateNumber })
                : t("A corrected copy of {{number}} is issued with its own number and QR code, and the old one points to it.", { number: action?.certificate.certificateNumber })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cert-action-reason">{t("Reason")}</Label>
            <Textarea id="cert-action-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction}>
              {t("Cancel")}
            </Button>
            <Button variant={action?.kind === "revoke" ? "destructive" : "default"} disabled={!reason.trim() || actionMutation.isPending} onClick={() => actionMutation.mutate()}>
              {action?.kind === "revoke" ? t("Revoke") : t("Reissue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Delete certificate")}
        description={t("Delete \"{{number}}\"? This cannot be undone.", { number: deleteTarget?.certificateNumber })}
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
