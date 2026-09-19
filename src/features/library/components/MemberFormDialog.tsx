import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student } from "@/features/students/types";
import type { StaffMember } from "@/features/staff/types";
import { PERSON_TYPE_OPTIONS } from "../constants";
import type { LibraryMember, LibraryMemberFormValues, LibraryMemberStatus, LibraryPersonType } from "../types";

const memberSchema = z.object({
  personType: z.enum(["student", "staff"] as [LibraryPersonType, ...LibraryPersonType[]]),
  personId: z.string().min(1, "Select a person"),
  status: z.enum(["active", "suspended"] as [LibraryMemberStatus, ...LibraryMemberStatus[]]),
});

type FormValues = z.infer<typeof memberSchema>;

const emptyValues: FormValues = { personType: "student", personId: "", status: "active" };

export default function MemberFormDialog({
  open,
  onOpenChange,
  member,
  students,
  staff,
  existingMembers,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: LibraryMember | null;
  students: Student[];
  staff: StaffMember[];
  existingMembers: LibraryMember[];
  submitting: boolean;
  onSubmit: (values: LibraryMemberFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(member);
  const {
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(memberSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(member ? { personType: member.personType, personId: member.personId, status: member.status } : emptyValues);
  }, [open, member, reset]);

  const personType = watch("personType");

  const memberPersonIds = useMemo(
    () => new Set(existingMembers.filter((m) => m.personType === personType && m.id !== member?.id).map((m) => m.personId)),
    [existingMembers, personType, member?.id],
  );

  const personOptions = useMemo(() => {
    if (personType === "student") {
      return students
        .filter((s) => !memberPersonIds.has(s.id))
        .map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} · ${s.className}-${s.section} (${s.admissionNumber})` }));
    }
    return staff
      .filter((s) => !memberPersonIds.has(s.id))
      .map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} · ${s.designation} (${s.employeeId})` }));
  }, [personType, students, staff, memberPersonIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit member" : "New library member"}</DialogTitle>
          <DialogDescription>Members are linked to an existing student or staff record, not duplicated.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mem-personType">Person type</Label>
            <Controller
              control={control}
              name="personType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                  }}
                  disabled={isEdit}
                >
                  <SelectTrigger id="mem-personType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSON_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mem-personId">{personType === "student" ? "Student" : "Staff member"}</Label>
            <Controller
              control={control}
              name="personId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                  <SelectTrigger id="mem-personId">
                    <SelectValue placeholder="Search and select a person" />
                  </SelectTrigger>
                  <SelectContent>
                    {personOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.personId && <p className="text-xs text-red-600">{errors.personId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mem-status">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="mem-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
