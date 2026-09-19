import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatRelativeDay } from "@/utils/format";
import { CERTIFICATE_TYPE_CONFIG, CERTIFICATE_TYPE_OPTIONS } from "../constants";
import { deleteIssuedCertificate, listIssuedCertificates } from "../api";
import type { IssuedCertificate } from "../types";
import CertificateView from "./CertificateView";

export default function IssuedCertificatesTab() {
  const queryClient = useQueryClient();
  const { data: certificates = [], isLoading } = useQuery({ queryKey: ["certificates"], queryFn: listIssuedCertificates });

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
          <p className="text-sm font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{row.original.certificateNumber}</p>
          <p className="text-xs text-slate-500">{formatRelativeDay(row.original.issuedOn)}</p>
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
          <p className="text-sm text-slate-800">{row.original.recipientName}</p>
          <p className="text-xs text-slate-500">{row.original.recipientSubtitle}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const cert = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewing(cert)}>
                <Eye className="w-3.5 h-3.5" />
                View / print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(cert)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No certificates issued yet." pageSize={10} />

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
