import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/tables/DataTable";
import { getMyStaffId, listLeaveRequests } from "@/features/staff/api";
import { LEAVE_TYPES } from "@/features/staff/constants";
import type { LeaveStatus, StaffLeaveRequest } from "@/features/staff/types";

import { useTranslation } from "react-i18next";
const STATUS: Record<LeaveStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inclusive number of calendar days a leave covers. */
const leaveDays = (r: StaffLeaveRequest) =>
  Math.max(1, Math.round((new Date(r.toDate).getTime() - new Date(r.fromDate).getTime()) / DAY_MS) + 1);

const typeLabel = (r: StaffLeaveRequest) => LEAVE_TYPES.find((t) => t.value === r.leaveType)?.label ?? r.leaveType;

/**
 * Teachers don't see the staff attendance register. This is their read-only view instead: how many leave days they have
 * taken this year and when each leave was. Requesting leave stays under Staff management.
 */
export default function MyLeaveSummaryTab() {
  const { t } = useTranslation("attendance");
  const { data: myStaffId = null, isLoading: idLoading } = useQuery({ queryKey: ["staff", "me"], queryFn: getMyStaffId });
  const { data: all = [], isLoading, isError, refetch } = useQuery({ queryKey: ["staff", "leave"], queryFn: listLeaveRequests });

  const mine = useMemo(
    () => all.filter((r) => r.staffId === myStaffId).sort((a, b) => b.fromDate.localeCompare(a.fromDate)),
    [all, myStaffId],
  );
  const year = new Date().getFullYear();
  const takenThisYear = mine
    .filter((r) => r.status === "approved" && new Date(r.fromDate).getFullYear() === year)
    .reduce((sum, r) => sum + leaveDays(r), 0);
  const approvedCount = mine.filter((r) => r.status === "approved").length;
  const pendingCount = mine.filter((r) => r.status === "pending").length;

  const columns: ColumnDef<StaffLeaveRequest, unknown>[] = [
    { id: "type", header: t("Leave type"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{typeLabel(row.original)}</span> },
    {
      id: "dates",
      header: t("Dates"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.fromDate === row.original.toDate ? row.original.fromDate : `${row.original.fromDate} → ${row.original.toDate}`}
        </span>
      ),
    },
    { id: "days", header: t("Days"), cell: ({ row }) => <span className="text-sm tabular-nums">{leaveDays(row.original)}</span> },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => <Badge variant={STATUS[row.original.status].variant}>{t(STATUS[row.original.status].label)}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("Leave days taken in {{year}}", { year })} value={takenThisYear} />
        <Stat label={t("Approved leaves")} value={approvedCount} />
        <Stat label={t("Waiting for approval")} value={pendingCount} />
      </div>
      <DataTable
        columns={columns}
        data={mine}
        isLoading={isLoading || idLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage={t("You haven't taken any leave.")}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
