import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarCheck, CheckCircle2, Clock, GraduationCap, Plus, UserCheck, UserPlus, Users, Wallet, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatRelativeDay } from "@/utils/format";
import { ADMISSION_STAGE_CONFIG } from "../constants";
import {
  createAdmission,
  decideAdmission,
  enrollAdmission,
  listAdmissions,
  promoteFromWaitlist,
  recordAdmissionFeePayment,
  registerAdmission,
  rejectAdmission,
  updateAdmissionExam,
  updateAdmissionInterview,
  withdrawAdmission,
} from "../api";
import type { AdmissionApplication, AdmissionStage } from "../types";
import AdmissionFormDialog from "./AdmissionFormDialog";
import AdmissionRegistrationDialog from "./AdmissionRegistrationDialog";
import AdmissionExamDialog from "./AdmissionExamDialog";
import AdmissionInterviewDialog from "./AdmissionInterviewDialog";
import AdmissionDecisionDialog from "./AdmissionDecisionDialog";
import AdmissionFeePaymentDialog from "./AdmissionFeePaymentDialog";
import SeatAvailabilityCard from "./SeatAvailabilityCard";
import { RowActions } from "@/components/ui/row-actions";

type DialogKey = "create" | "register" | "exam" | "interview" | "decision" | "fee";

export default function AdmissionsTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: applications = [], isLoading, isError, refetch } = useQuery({ queryKey: ["students", "admissions"], queryFn: listAdmissions });

  const [stageFilter, setStageFilter] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState<DialogKey | null>(null);
  const [activeApp, setActiveApp] = useState<AdmissionApplication | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ app: AdmissionApplication; action: "reject" | "withdraw" | "enroll" } | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students", "admissions"] });
    queryClient.invalidateQueries({ queryKey: ["students", "seat-availability"] });
  };

  const createMutation = useMutation({
    mutationFn: createAdmission,
    onSuccess: () => {
      invalidate();
      toast.success("Application submitted");
      setOpenDialog(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not submit application"),
  });

  const registerMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof registerAdmission>[1] }) => registerAdmission(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Application registered");
      setOpenDialog(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not register application"),
  });

  const examMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof updateAdmissionExam>[1] }) => updateAdmissionExam(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Entrance exam updated");
      setOpenDialog(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update exam details"),
  });

  const interviewMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof updateAdmissionInterview>[1] }) => updateAdmissionInterview(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Interview updated");
      setOpenDialog(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update interview details"),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof decideAdmission>[1] }) => decideAdmission(id, values),
    onSuccess: (app) => {
      invalidate();
      toast.success(`Marked as ${ADMISSION_STAGE_CONFIG[app.stage].label.toLowerCase()}`);
      setOpenDialog(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not record decision"),
  });

  const feeMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof recordAdmissionFeePayment>[1] }) => recordAdmissionFeePayment(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Fee payment recorded");
      setOpenDialog(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not record payment"),
  });

  const promoteMutation = useMutation({
    mutationFn: promoteFromWaitlist,
    onSuccess: () => {
      invalidate();
      toast.success("Promoted from waitlist to fee collection");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not promote applicant"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectAdmission(id),
    onSuccess: () => {
      invalidate();
      toast.success("Application rejected");
      setConfirmTarget(null);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawAdmission,
    onSuccess: () => {
      invalidate();
      toast.success("Application withdrawn");
      setConfirmTarget(null);
    },
  });

  const enrollMutation = useMutation({
    mutationFn: enrollAdmission,
    onSuccess: ({ application, student }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setConfirmTarget(null);
      toast.success(
        (t) => (
          <span className="flex items-center gap-2">
            {application.applicantFirstName} enrolled as {student.admissionNumber}
            <button
              className="underline font-medium"
              onClick={() => {
                toast.dismiss(t.id);
                navigate(`/students/${student.id}`);
              }}
            >
              View
            </button>
          </span>
        ),
      );
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not enroll applicant"),
  });

  const filtered = useMemo(
    () => (stageFilter === "all" ? applications : applications.filter((a) => a.stage === stageFilter)),
    [applications, stageFilter],
  );

  const openFor = (dialog: DialogKey, app: AdmissionApplication) => {
    setActiveApp(app);
    setOpenDialog(dialog);
  };

  const columns: ColumnDef<AdmissionApplication, unknown>[] = [
    {
      id: "applicant",
      header: "Applicant",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.original.applicantFirstName} {row.original.applicantLastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.applicationNumber} &middot; {row.original.guardianName}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "appliedClass",
      header: "Applied class",
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.appliedClass}</span>,
    },
    {
      accessorKey: "submittedAt",
      header: "Submitted",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {formatRelativeDay(row.original.submittedAt)}
        </span>
      ),
    },
    {
      accessorKey: "stage",
      header: "Stage",
      cell: ({ row }) => {
        const config = ADMISSION_STAGE_CONFIG[row.original.stage];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const app = row.original;
        const canRejectOrWithdraw = !["enrolled", "rejected", "withdrawn"].includes(app.stage);

        return (
          <div className="flex items-center justify-end gap-1.5">
            {app.stage === "inquiry" && (
              <Button size="sm" variant="outline" onClick={() => openFor("register", app)}>
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </Button>
            )}
            {app.stage === "registration" && (
              <Button size="sm" variant="outline" onClick={() => openFor("exam", app)}>
                <CalendarCheck className="w-3.5 h-3.5" />
                Entrance exam
              </Button>
            )}
            {app.stage === "entrance_exam" && (
              <Button size="sm" variant="outline" onClick={() => openFor("interview", app)}>
                <Users className="w-3.5 h-3.5" />
                Interview
              </Button>
            )}
            {app.stage === "interview" && (
              <Button size="sm" variant="outline" onClick={() => openFor("decision", app)}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Decide
              </Button>
            )}
            {app.stage === "fee_collection" && !app.admissionFeePaid && (
              <Button size="sm" variant="outline" onClick={() => openFor("fee", app)}>
                <Wallet className="w-3.5 h-3.5" />
                Record fee
              </Button>
            )}
            {app.stage === "fee_collection" && app.admissionFeePaid && (
              <Button
                size="sm"
                className="text-success-strong border-success/30 hover:bg-success-soft"
                variant="outline"
                onClick={() => setConfirmTarget({ app, action: "enroll" })}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Enroll
              </Button>
            )}
            {app.stage === "waitlisted" && (
              <Button size="sm" variant="outline" onClick={() => promoteMutation.mutate(app.id)} disabled={promoteMutation.isPending}>
                <UserCheck className="w-3.5 h-3.5" />
                Promote
              </Button>
            )}
            {app.stage === "enrolled" && app.studentId && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/students/${app.studentId}`)}>
                View student
              </Button>
            )}

            {(app.stage === "entrance_exam" || app.stage === "interview" || app.stage === "fee_collection") && (
              <RowActions>
                {app.stage === "entrance_exam" && (
                  <DropdownMenuItem onClick={() => openFor("exam", app)}>
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Edit exam details
                  </DropdownMenuItem>
                )}
                {app.stage === "interview" && (
                  <DropdownMenuItem onClick={() => openFor("interview", app)}>
                    <Users className="w-3.5 h-3.5" />
                    Edit interview details
                  </DropdownMenuItem>
                )}
                {canRejectOrWithdraw && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setConfirmTarget({ app, action: "reject" })}
                      variant="destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setConfirmTarget({ app, action: "withdraw" })}>
                      Withdraw
                    </DropdownMenuItem>
                  </>
                )}
              </RowActions>
            )}
            {canRejectOrWithdraw && app.stage !== "entrance_exam" && app.stage !== "interview" && app.stage !== "fee_collection" && (
              <RowActions>
                <DropdownMenuItem
                  onClick={() => setConfirmTarget({ app, action: "reject" })}
                  variant="destructive"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmTarget({ app, action: "withdraw" })}>Withdraw</DropdownMenuItem>
              </RowActions>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <SeatAvailabilityCard />

      <DataTableToolbar>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {(Object.keys(ADMISSION_STAGE_CONFIG) as AdmissionStage[]).map((stage) => (
              <SelectItem key={stage} value={stage}>
                {ADMISSION_STAGE_CONFIG[stage].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setOpenDialog("create")}>
          <Plus className="w-4 h-4" />
          New inquiry
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No admission applications." />

      <AdmissionFormDialog
        open={openDialog === "create"}
        onOpenChange={(v) => setOpenDialog(v ? "create" : null)}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <AdmissionRegistrationDialog
        open={openDialog === "register"}
        onOpenChange={(v) => setOpenDialog(v ? "register" : null)}
        application={activeApp}
        submitting={registerMutation.isPending}
        onSubmit={async (values) => {
          if (activeApp) await registerMutation.mutateAsync({ id: activeApp.id, values });
        }}
      />

      <AdmissionExamDialog
        open={openDialog === "exam"}
        onOpenChange={(v) => setOpenDialog(v ? "exam" : null)}
        application={activeApp}
        submitting={examMutation.isPending}
        onSubmit={async (values) => {
          if (activeApp) await examMutation.mutateAsync({ id: activeApp.id, values });
        }}
      />

      <AdmissionInterviewDialog
        open={openDialog === "interview"}
        onOpenChange={(v) => setOpenDialog(v ? "interview" : null)}
        application={activeApp}
        submitting={interviewMutation.isPending}
        onSubmit={async (values) => {
          if (activeApp) await interviewMutation.mutateAsync({ id: activeApp.id, values });
        }}
      />

      <AdmissionDecisionDialog
        open={openDialog === "decision"}
        onOpenChange={(v) => setOpenDialog(v ? "decision" : null)}
        application={activeApp}
        submitting={decisionMutation.isPending}
        onSubmit={async (values) => {
          if (activeApp) await decisionMutation.mutateAsync({ id: activeApp.id, values });
        }}
      />

      <AdmissionFeePaymentDialog
        open={openDialog === "fee"}
        onOpenChange={(v) => setOpenDialog(v ? "fee" : null)}
        application={activeApp}
        submitting={feeMutation.isPending}
        onSubmit={async (values) => {
          if (activeApp) await feeMutation.mutateAsync({ id: activeApp.id, values });
        }}
      />

      <ConfirmDialog
        open={confirmTarget?.action === "reject"}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title="Reject application"
        description={`Reject the application for "${confirmTarget?.app.applicantFirstName} ${confirmTarget?.app.applicantLastName}"? This cannot be undone.`}
        confirmLabel="Reject"
        confirmVariant="destructive"
        submitting={rejectMutation.isPending}
        onConfirm={() => {
          if (confirmTarget) rejectMutation.mutate(confirmTarget.app.id);
        }}
      />

      <ConfirmDialog
        open={confirmTarget?.action === "withdraw"}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title="Withdraw application"
        description={`Mark "${confirmTarget?.app.applicantFirstName} ${confirmTarget?.app.applicantLastName}"'s application as withdrawn? This cannot be undone.`}
        confirmLabel="Withdraw"
        confirmVariant="destructive"
        submitting={withdrawMutation.isPending}
        onConfirm={() => {
          if (confirmTarget) withdrawMutation.mutate(confirmTarget.app.id);
        }}
      />

      <ConfirmDialog
        open={confirmTarget?.action === "enroll"}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title="Enroll applicant"
        description={`Create a student record for "${confirmTarget?.app.applicantFirstName} ${confirmTarget?.app.applicantLastName}" in ${confirmTarget?.app.appliedClass}?`}
        confirmLabel="Enroll"
        submitting={enrollMutation.isPending}
        onConfirm={() => {
          if (confirmTarget) enrollMutation.mutate(confirmTarget.app.id);
        }}
      />
    </div>
  );
}
