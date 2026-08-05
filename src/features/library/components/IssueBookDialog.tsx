import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_LOAN_PERIOD_DAYS } from "../constants";
import type { Book, IssueBookFormValues, LibraryMember } from "../types";

const issueSchema = z.object({
  bookId: z.string().min(1, "Select a book"),
  memberId: z.string().min(1, "Select a member"),
  dueDate: z.string().min(1, "Due date is required"),
});

type FormValues = z.infer<typeof issueSchema>;

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_LOAN_PERIOD_DAYS);
  return d.toISOString().slice(0, 10);
}

export default function IssueBookDialog({
  open,
  onOpenChange,
  books,
  members,
  memberLabel,
  initialBookId,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: Book[];
  members: LibraryMember[];
  memberLabel: (member: LibraryMember) => string;
  initialBookId?: string;
  submitting: boolean;
  onSubmit: (values: IssueBookFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: { bookId: "", memberId: "", dueDate: defaultDueDate() },
  });

  useEffect(() => {
    if (open) reset({ bookId: initialBookId ?? "", memberId: "", dueDate: defaultDueDate() });
  }, [open, initialBookId, reset]);

  const availableBooks = useMemo(() => books.filter((b) => b.availableCopies > 0), [books]);
  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue book</DialogTitle>
          <DialogDescription>Pick an available book and an active member, then set a due date.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="issue-bookId">Book</Label>
            <Controller
              control={control}
              name="bookId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="issue-bookId">
                    <SelectValue placeholder="Select a book" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBooks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title} ({b.availableCopies} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.bookId && <p className="text-xs text-red-600">{errors.bookId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issue-memberId">Member</Label>
            <Controller
              control={control}
              name="memberId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="issue-memberId">
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
            {errors.memberId && <p className="text-xs text-red-600">{errors.memberId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issue-dueDate">Due date</Label>
            <Input id="issue-dueDate" type="date" {...register("dueDate")} />
            {errors.dueDate && <p className="text-xs text-red-600">{errors.dueDate.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Issue book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
