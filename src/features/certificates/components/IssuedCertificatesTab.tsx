import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatRelativeDay } from "@/utils/format";
import { CERTIFICATE_TYPE_CONFIG, CERTIFICATE_TYPE_OPTIONS } from "../constants";
import { deleteIssuedCertificate, listIssuedCertificates } from "../api";
import type { IssuedCertificate } from "../types";
import CertificateView from "./CertificateView";
import { RowActions } from "@/components/ui/row-actions";

export default function IssuedCertificatesTab() {
  const queryClient = useQueryClient();
  const { data: certificates = [], isLoading, isError, refetch } = useQuery({ queryKey: ["certificates"], queryFn: listIssuedCertificates });

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<IssuedCertificate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IssuedCertificate | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteIssuedCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success(`${deleteTarget?.certificateNumber} removed`);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete certificate"),
  });

  const filtered = useMemo(
    () => (typeFilter === "all" ? certificates : certificates.filter((c) => c.type === typeFilter)),
    [certificates, typeFilter],
  );

  const columns: ColumnDef<IssuedCertificate, unknown>[] = [
    {
      accessorKey: "certificateNumber",
      header: "Certificate #",
      cell: ({ row }) => (
        <button type="button" onClick={() => setViewing(row.original)} className="text-left cursor-pointer group">
          <p className="text-sm font-medium text-foreground group-hover:text-primary-text transition-colors">{row.original.certificateNumber}</p>
          <p className="text-xs text-muted-foreground">{formatRelativeDay(row.original.issuedOn)}</p>
        </button>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="info">{CERTIFICATE_TYPE_CONFIG[row.original.type].label}</Badge>,
    },
    {
      id: "recipient",
      header: "Recipient",
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
              View / print
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(cert)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
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
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CERTIFICATE_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.type} value={o.type}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No certificates issued yet." pageSize={10} />

      <CertificateView open={Boolean(viewing)} onOpenChange={(v) => !v && setViewing(null)} certificate={viewing} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete certificate"
        description={`Delete "${deleteTarget?.certificateNumber}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
