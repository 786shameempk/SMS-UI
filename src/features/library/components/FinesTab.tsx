import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CircleCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { formatCurrency } from "@/utils/format";
import { listBooks, listLoans, listMembers, markFinePaid } from "../api";
import { FINE_PER_DAY } from "../constants";
import type { BookLoan, LibraryMember } from "../types";

interface FineRow {
  loan: BookLoan;
  fineAmount: number;
  finalized: boolean;
}

export default function FinesTab() {
  const queryClient = useQueryClient();

  const { data: loans = [], isLoading, isError, refetch } = useQuery({ queryKey: ["library", "loans"], queryFn: listLoans });
  const { data: books = [] } = useQuery({ queryKey: ["library", "books"], queryFn: listBooks });
  const { data: members = [] } = useQuery({ queryKey: ["library", "members"], queryFn: listMembers });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const bookById = useMemo(() => new Map(books.map((b) => [b.id, b] as const)), [books]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m] as const)), [members]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s] as const)), [staff]);

  const memberLabel = (member: LibraryMember): string => {
    const person = member.personType === "student" ? studentById.get(member.personId) : staffById.get(member.personId);
    const name = person ? `${person.firstName} ${person.lastName}` : "Unknown";
    return `${name} (${member.membershipId})`;
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["library", "loans"] });

  const markPaidMutation = useMutation({
    mutationFn: markFinePaid,
    onSuccess: () => {
      invalidate();
      toast.success("Fine marked as paid");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update fine"),
  });

  const rows: FineRow[] = useMemo(() => {
    const finalized: FineRow[] = loans
      .filter((l) => (l.fineAmount ?? 0) > 0)
      .map((loan) => ({ loan, fineAmount: loan.fineAmount ?? 0, finalized: true }));

    const running: FineRow[] = loans
      .filter((l) => l.status === "overdue")
      .map((loan) => {
        const daysLate = Math.max(0, Math.floor((Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
        return { loan, fineAmount: daysLate * FINE_PER_DAY, finalized: false };
      });

    return [...finalized, ...running].sort((a, b) => new Date(b.loan.dueDate).getTime() - new Date(a.loan.dueDate).getTime());
  }, [loans]);

  const columns: ColumnDef<FineRow, unknown>[] = [
    { id: "book", header: "Book", cell: ({ row }) => <span className="text-sm font-medium text-foreground">{bookById.get(row.original.loan.bookId)?.title ?? "—"}</span> },
    {
      id: "member",
      header: "Member",
      cell: ({ row }) => {
        const member = memberById.get(row.original.loan.memberId);
        return <span className="text-sm text-foreground">{member ? memberLabel(member) : "—"}</span>;
      },
    },
    { id: "dueDate", header: "Due date", cell: ({ row }) => <span className="text-sm text-secondary-foreground">{new Date(row.original.loan.dueDate).toLocaleDateString()}</span> },
    {
      id: "returnedOn",
      header: "Returned",
      cell: ({ row }) =>
        row.original.loan.returnedOn ? (
          <span className="text-sm text-secondary-foreground">{new Date(row.original.loan.returnedOn).toLocaleDateString()}</span>
        ) : (
          <Badge variant="danger">Not yet returned</Badge>
        ),
    },
    {
      id: "fineAmount",
      header: "Fine",
      cell: ({ row }) => (
        <span className="text-sm text-foreground tabular-nums">
          {formatCurrency(row.original.fineAmount)}
          {!row.original.finalized && <span className="text-xs text-muted-foreground"> (running)</span>}
        </span>
      ),
    },
    {
      id: "paid",
      header: "Status",
      cell: ({ row }) => {
        if (!row.original.finalized) return <Badge variant="warning">Awaiting return</Badge>;
        return row.original.loan.finePaid ? <Badge variant="success">Paid</Badge> : <Badge variant="danger">Unpaid</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (!row.original.finalized || row.original.loan.finePaid) return null;
        return (
          <Button variant="outline" size="sm" onClick={() => markPaidMutation.mutate(row.original.loan.id)} disabled={markPaidMutation.isPending}>
            <CircleCheck className="w-3.5 h-3.5" />
            Mark paid
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">
          Fines accrue at {formatCurrency(FINE_PER_DAY)}/day past the due date. Overdue loans show a running estimate until returned.
        </p>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={rows} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No fines to show." />
    </div>
  );
}
