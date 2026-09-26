import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Book, LibraryMember, ReserveBookFormValues } from "../types";

const reserveSchema = z.object({
  bookId: z.string().min(1, "Select a book"),
  memberId: z.string().min(1, "Select a member"),
});

type FormValues = z.infer<typeof reserveSchema>;

const emptyValues: FormValues = { bookId: "", memberId: "" };

export default function ReserveBookDialog({
  open,
  onOpenChange,
  books,
  members,
  memberLabel,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: Book[];
  members: LibraryMember[];
  memberLabel: (member: LibraryMember) => string;
  submitting: boolean;
  onSubmit: (values: ReserveBookFormValues) => Promise<void>;
}) {
  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(reserveSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const fullyBookedBooks = useMemo(() => books.filter((b) => b.availableCopies === 0), [books]);
  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve book</DialogTitle>
          <DialogDescription>Reservations can only be placed for books with zero copies currently available.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resv-bookId" required>Book</Label>
            <Controller
              control={control}
              name="bookId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="resv-bookId">
                    <SelectValue placeholder="Select a fully-booked title" />
                  </SelectTrigger>
                  <SelectContent>
                    {fullyBookedBooks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.bookId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.bookId.message}</p>}
            {fullyBookedBooks.length === 0 && <p className="text-xs text-muted-foreground">No books are fully booked right now.</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resv-memberId" required>Member</Label>
            <Controller
              control={control}
              name="memberId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="resv-memberId">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {memberLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.memberId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.memberId.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || fullyBookedBooks.length === 0}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Reserve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
