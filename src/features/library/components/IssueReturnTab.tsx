import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageCheck, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { formatCurrency } from "@/utils/format";
import { issueBook, listBooks, listLoans, listMembers, returnBook } from "../api";
import { FINE_PER_DAY, LOAN_STATUS_CONFIG } from "../constants";
import type { BookLoan, LibraryMember } from "../types";
import IssueBookDialog from "./IssueBookDialog";

export default function IssueReturnTab() {
  const { t } = useTranslation("library");
  const queryClient = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<BookLoan | null>(null);

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
    const name = person ? `${person.firstName} ${person.lastName}` : t("Unknown");
    return `${name} (${member.membershipId})`;
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["library"] });

  const issueMutation = useMutation({
    mutationFn: issueBook,
    onSuccess: () => {
      invalidate();
      toast.success(t("Book issued"));
      setIssueOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not issue book")),
  });

  const returnMutation = useMutation({
    mutationFn: returnBook,
    onSuccess: (loan) => {
      invalidate();
      toast.success(loan.fineAmount ? t("Book returned — fine of {{amount}} applies", { amount: formatCurrency(loan.fineAmount) }) : t("Book returned"));
      setReturnTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not return book")),
  });

  const sorted = [...loans].sort((a, b) => new Date(b.issuedOn).getTime() - new Date(a.issuedOn).getTime());

  const columns: ColumnDef<BookLoan, unknown>[] = [
    { id: "book", header: t("Book"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{bookById.get(row.original.bookId)?.title ?? "—"}</span> },
    {
      id: "member",
      header: t("Member"),
      cell: ({ row }) => {
        const member = memberById.get(row.original.memberId);
        return <span className="text-sm text-foreground">{member ? memberLabel(member) : "—"}</span>;
      },
    },
    { id: "issuedOn", header: t("Issued"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{new Date(row.original.issuedOn).toLocaleDateString()}</span> },
    { id: "dueDate", header: t("Due"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{new Date(row.original.dueDate).toLocaleDateString()}</span> },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => {
        const config = LOAN_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status !== "returned" ? (
          <Button variant="outline" size="sm" onClick={() => setReturnTarget(row.original)}>
            <PackageCheck className="w-3.5 h-3.5" />
            {t("Return")}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {row.original.fineAmount ? t("Fine: {{amount}}", { amount: formatCurrency(row.original.fineAmount) }) : t("No fine")}
          </span>
        ),
    },
  ];

  const returnDescription = useMemo(() => {
    if (!returnTarget) return "";
    const book = bookById.get(returnTarget.bookId);
    const daysLate = Math.max(0, Math.floor((Date.now() - new Date(returnTarget.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
    const fine = daysLate * FINE_PER_DAY;
    return fine > 0
      ? t('Mark "{{title}}" as returned? It is {{days}} day(s) overdue — a fine of {{amount}} will be recorded.', { title: book?.title, days: daysLate, amount: formatCurrency(fine) })
      : t('Mark "{{title}}" as returned? It is not overdue, so no fine applies.', { title: book?.title });
  }, [returnTarget, bookById, t]);

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Issue books to members and record returns; fines are computed automatically for late returns.")}</p>
        <Button onClick={() => setIssueOpen(true)}>
          <Plus className="w-4 h-4" />
          {t("Issue book")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={sorted} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No loans recorded yet.")} />

      <IssueBookDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        books={books}
        members={members}
        memberLabel={memberLabel}
        submitting={issueMutation.isPending}
        onSubmit={async (values) => {
          await issueMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(returnTarget)}
        onOpenChange={(v) => !v && setReturnTarget(null)}
        title={t("Return book")}
        description={returnDescription}
        confirmLabel={t("Mark returned")}
        submitting={returnMutation.isPending}
        onConfirm={() => {
          if (returnTarget) returnMutation.mutate(returnTarget.id);
        }}
      />
    </div>
  );
}
