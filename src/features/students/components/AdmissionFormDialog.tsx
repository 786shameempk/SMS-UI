import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentBranchId } from "@/utils/tenant";
import { listBranches } from "@/features/administration/branches/api";
import { useClassSectionOptions } from "../hooks";
import { listSeatAvailability } from "../api";
import type { AdmissionFormValues } from "../types";

const admissionFormSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  applicantFirstName: z.string().min(1, "First name is required"),
  applicantLastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianPhone: z.string().min(1, "Guardian phone is required"),
  guardianEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  appliedClass: z.string().min(1, "Select a class"),
  notes: z.string().optional(),
});

export default function AdmissionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdmissionFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { data: branches = [] } = useQuery({ queryKey: ["admin", "branches"], queryFn: listBranches });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      branchId: getCurrentBranchId(),
      applicantFirstName: "",
      applicantLastName: "",
      dateOfBirth: "",
      gender: "male",
      guardianName: "",
      guardianPhone: "",
      guardianEmail: "",
      appliedClass: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        branchId: getCurrentBranchId(),
        applicantFirstName: "",
        applicantLastName: "",
        dateOfBirth: "",
        gender: "male",
        guardianName: "",
        guardianPhone: "",
        guardianEmail: "",
        appliedClass: "",
        notes: "",
      });
    }
  }, [open, reset]);

  const branchId = watch("branchId");
  const { classNames, isLoading: classesLoading } = useClassSectionOptions(branchId);
  const { data: seatAvailability = [] } = useQuery({
    queryKey: ["students", "seat-availability", branchId],
    queryFn: () => listSeatAvailability(branchId),
    enabled: open,
  });
  const appliedClass = watch("appliedClass");
  const seats = seatAvailability.find((s) => s.className === appliedClass);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New admission application</DialogTitle>
          <DialogDescription>Submit a prospective student for review before enrollment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, guardianEmail: values.guardianEmail?.trim() || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="branchId">Branch</Label>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="branchId">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.branchId && <p className="text-xs text-red-600">{errors.branchId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="applicantFirstName">First name</Label>
              <Input id="applicantFirstName" {...register("applicantFirstName")} />
              {errors.applicantFirstName && <p className="text-xs text-red-600">{errors.applicantFirstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="applicantLastName">Last name</Label>
              <Input id="applicantLastName" {...register("applicantLastName")} />
              {errors.applicantLastName && <p className="text-xs text-red-600">{errors.applicantLastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth && <p className="text-xs text-red-600">{errors.dateOfBirth.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appliedClass">Applying for class</Label>
            <Controller
              control={control}
              name="appliedClass"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="appliedClass">
                    <SelectValue placeholder={classesLoading ? "Loading…" : classNames.length ? "Select a class" : "No classes in this branch"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.appliedClass && <p className="text-xs text-red-600">{errors.appliedClass.message}</p>}
            {seats && (
              <p className={`text-xs ${seats.availableSeats > 0 ? "text-muted-foreground" : "text-amber-700"}`}>
                {seats.availableSeats > 0
                  ? `${seats.availableSeats} of ${seats.capacity} seats currently available in ${seats.className}.`
                  : `${seats.className} has no seats currently available — the applicant may need to be waitlisted.`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="guardianName">Guardian name</Label>
              <Input id="guardianName" {...register("guardianName")} />
              {errors.guardianName && <p className="text-xs text-red-600">{errors.guardianName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guardianPhone">Guardian phone</Label>
              <Input id="guardianPhone" {...register("guardianPhone")} />
              {errors.guardianPhone && <p className="text-xs text-red-600">{errors.guardianPhone.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guardianEmail">Guardian email (optional)</Label>
            <Input id="guardianEmail" type="email" {...register("guardianEmail")} />
            {errors.guardianEmail && <p className="text-xs text-red-600">{errors.guardianEmail.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
