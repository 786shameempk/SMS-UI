import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Clock, MoreHorizontal, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { approveAdmission, createAdmission, listAdmissions, setAdmissionStatus } from "../api";
import { formatRelativeDay } from "@/utils/format";
import type { AdmissionApplication, AdmissionStatus } from "../types";
import AdmissionFormDialog from "./AdmissionFormDialog";

const STATUS_CONFIG: Record<AdmissionStatus, { label: string; variant: "success" | "danger" | "warning" | "neutral" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  waitlisted: { label: "Waitlisted", variant: "neutral" },
};

export default function AdmissionsTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: applications = [], isLoading } = useQuery({ queryKey: ["students", "admissions"], queryFn: listAdmissions });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["students", "admissions"] });

  const createMutation = useMutation({
    mutationFn: createAdmission,
    onSuccess: () => {
      invalidate();
      toast.success("Application submitted");
      setFormOpen(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdmissionStatus }) => setAdmissionStatus(id, status),
    onSuccess: (app) => {
      invalidate();
      toast.success(`${app.applicantFirstName} ${STATUS_CONFIG[app.status].label.toLowerCase()}`);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveAdmission(id),
    onSuccess: ({ application, student }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success(
        (t) => (
          <span className="flex items-center gap-2">
            {application.applicantFirstName} enrolled as {student.admissionNumber}
            <button className="underline font-medium" onClick={() => { toast.dismiss(t.id); navigate(`/students/${student.id}`); }}>
              View
            </button>
          </span>
        ),
      );
    },
  });

  const filtered = useMemo(
    () => (statusFilter === "all" ? applications : applications.filter((a) => a.status === statusFilter)),
    [applications, statusFilter],
  );

  const columns: ColumnDef<AdmissionApplication, unknown>[] = [
    {
      id: "applicant",
      header: "Applicant",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">
            {row.original.applicantFirstName} {row.original.applicantLastName}
          </p>
          <p className="text-xs text-slate-500">{row.original.guardianName} &middot; {row.original.guardianPhone}</p>
        </div>
      ),
    },
    {
      accessorKey: "appliedClass",
      header: "Applied class",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.appliedClass}</span>,
    },
    {
      accessorKey: "submittedAt",
      header: "Submitted",
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {formatRelativeDay(row.original.submittedAt)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const app = row.original;
        if (app.status !== "pending" && app.status !== "waitlisted") return null;
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-200 hover:bg-green-50"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate(app.id)}
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {app.status !== "waitlisted" && (
                  <DropdownMenuItem onClick={() => statusMutation.mutate({ id: app.id, status: "waitlisted" })}>
                    <Clock className="w-3.5 h-3.5" />
                    Waitlist
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => statusMutation.mutate({ id: app.id, status: "rejected" })}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          New application
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No admission applications." />

      <AdmissionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
