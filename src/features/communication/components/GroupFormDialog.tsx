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
import type { Student } from "@/features/students/types";
import type { StaffMember } from "@/features/staff/types";
import { AUDIENCE_TYPE_OPTIONS } from "../constants";
import type { AudienceType, ContactGroup, ContactGroupFormValues } from "../types";
import MultiSelectList from "./MultiSelectList";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  audienceType: z.enum(["students", "staff", "parents"] as [AudienceType, ...AudienceType[]]),
  memberIds: z.array(z.string()).min(1, "Select at least one member"),
});

type FormValues = z.infer<typeof groupSchema>;

const emptyValues: FormValues = { name: "", description: "", audienceType: "students", memberIds: [] };

export default function GroupFormDialog({
  open,
  onOpenChange,
  group,
  students,
  staff,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: ContactGroup | null;
  students: Student[];
  staff: StaffMember[];
  submitting: boolean;
  onSubmit: (values: ContactGroupFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(group);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(groupSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      group
        ? { name: group.name, description: group.description ?? "", audienceType: group.audienceType, memberIds: group.memberIds }
        : emptyValues,
    );
  }, [open, group, reset]);

  const audienceType = watch("audienceType");

  const memberOptions = useMemo(() => {
    if (audienceType === "staff") {
      return staff.map((s) => ({ id: s.id, label: `${s.firstName} ${s.lastName}`, sublabel: `${s.designation} · ${s.employeeId}` }));
    }
    return students.map((s) => ({
      id: s.id,
      label: `${s.firstName} ${s.lastName}`,
      sublabel: `${s.className}-${s.section} · ${s.admissionNumber}`,
    }));
  }, [audienceType, staff, students]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit group" : "New group"}</DialogTitle>
          <DialogDescription>
            {audienceType === "parents"
              ? "Members are students — messages sent to this group reach their parents/guardians."
              : "A named list of recipients you can target quickly when composing a broadcast."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, description: values.description?.trim() || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grp-name">Group name</Label>
            <Input id="grp-name" placeholder="e.g. Grade 10 Parents" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grp-description">Description (optional)</Label>
            <Input id="grp-description" placeholder="e.g. Parents/guardians of all Grade 10 students" {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grp-audienceType">Audience</Label>
            <Controller
              control={control}
              name="audienceType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("memberIds", []);
                  }}
                >
                  <SelectTrigger id="grp-audienceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Controller
            control={control}
            name="memberIds"
            render={({ field }) => (
              <MultiSelectList
                label={audienceType === "staff" ? "Staff members" : "Students"}
                options={memberOptions}
                selected={field.value}
                onChange={field.onChange}
                searchPlaceholder={audienceType === "staff" ? "Search staff…" : "Search students…"}
              />
            )}
          />
          {errors.memberIds && <p className="text-xs text-red-600">{errors.memberIds.message}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
