import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { PackageCheck, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { cancelReservation, fulfillReservation, listBooks, listMembers, listReservations, reserveBook } from "../api";
import { DEFAULT_LOAN_PERIOD_DAYS, RESERVATION_STATUS_CONFIG } from "../constants";
import type { BookReservation, LibraryMember } from "../types";
import ReserveBookDialog from "./ReserveBookDialog";

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_LOAN_PERIOD_DAYS);
  return d.toISOString().slice(0, 10);
}

export default function ReservationsTab() {
  const queryClient = useQueryClient();
  const [reserveOpen, setReserveOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<BookReservation | null>(null);
  const [fulfillTarget, setFulfillTarget] = useState<BookReservation | null>(null);

  const { data: reservations = [], isLoading } = useQuery({ queryKey: ["library", "reservations"], queryFn: listReservations });
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["library"] });

  const reserveMutation = useMutation({
    mutationFn: reserveBook,
    onSuccess: () => {
      invalidate();
      toast.success("Reservation placed");
      setReserveOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not place reservation"),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      invalidate();
      toast.success("Reservation cancelled");
      setCancelTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not cancel reservation"),
  });

  const fulfillMutation = useMutation({
    mutationFn: (id: string) => fulfillReservation(id, defaultDueDate()),
    onSuccess: () => {
      invalidate();
      toast.success("Reservation fulfilled — book issued to member");
      setFulfillTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not fulfill reservation"),
  });

  const sorted = [...reservations].sort((a, b) => new Date(b.reservedOn).getTime() - new Date(a.reservedOn).getTime());

  const columns: ColumnDef<BookReservation, unknown>[] = [
    { id: "book", header: "Book", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{bookById.get(row.original.bookId)?.title ?? "—"}</span> },
    {
      id: "member",
      header: "Member",
      cell: ({ row }) => {
        const member = memberById.get(row.original.memberId);
        return <span className="text-sm text-slate-700">{member ? memberLabel(member) : "—"}</span>;
      },
    },
    { id: "reservedOn", header: "Reserved on", cell: ({ row }) => <span className="text-sm text-slate-600">{new Date(row.original.reservedOn).toLocaleDateString()}</span> },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = RESERVATION_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const reservation = row.original;
        if (reservation.status !== "pending") return null;
        const book = bookById.get(reservation.bookId);
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!book || book.availableCopies <= 0}
              onClick={() => setFulfillTarget(reservation)}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Fulfill
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCancelTarget(reservation)}>
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Members can reserve a title once every copy is checked out.</p>
        <Button onClick={() => setReserveOpen(true)}>
          <Plus className="w-4 h-4" />
          Reserve book
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={sorted} isLoading={isLoading} emptyMessage="No reservations yet." />

      <ReserveBookDialog
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        books={books}
        members={members}
        memberLabel={memberLabel}
        submitting={reserveMutation.isPending}
        onSubmit={async (values) => {
          await reserveMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(fulfillTarget)}
        onOpenChange={(v) => !v && setFulfillTarget(null)}
        title="Fulfill reservation"
        description={`Hand over "${fulfillTarget ? bookById.get(fulfillTarget.bookId)?.title : ""}" to this member? This issues the book and sets a due date ${DEFAULT_LOAN_PERIOD_DAYS} days from today.`}
        confirmLabel="Fulfill & issue"
        submitting={fulfillMutation.isPending}
        onConfirm={() => {
          if (fulfillTarget) fulfillMutation.mutate(fulfillTarget.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title="Cancel reservation"
        description="Cancel this reservation? The member will need to place a new one if they still want the title."
        confirmLabel="Cancel reservation"
        confirmVariant="destructive"
        submitting={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
        }}
      />
    </div>
  );
}
