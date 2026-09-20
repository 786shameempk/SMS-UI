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
import { DESIGNATIONS } from "../constants";
import type { StaffDesignation, StaffFormValues, StaffMember } from "../types";

const staffFormSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  designation: z.enum(DESIGNATIONS as unknown as [StaffDesignation, ...StaffDesignation[]]),
  department: z.string().min(1, "Department is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  address: z.string().min(1, "Address is required"),
});

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffMember | null;
  onSubmit: (values: StaffFormValues) => Promise<void>;
  submitting: boolean;
}

export default function StaffFormDialog({ open, onOpenChange, staff, onSubmit, submitting }: StaffFormDialogProps) {
  const isEdit = Boolean(staff);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      branchId: getCurrentBranchId(),
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "male",
      designation: "Teacher",
      department: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const { data: branches = [] } = useQuery({ queryKey: ["admin", "branches"], queryFn: listBranches });

  useEffect(() => {
    if (open) {
      reset(
        staff
          ? {
              branchId: staff.branchId,
              firstName: staff.firstName,
              lastName: staff.lastName,
              dateOfBirth: staff.dateOfBirth.slice(0, 10),
              gender: staff.gender,
              designation: staff.designation,
              department: staff.department,
              phone: staff.phone,
              email: staff.email,
              address: staff.address,
            }
          : {
              branchId: getCurrentBranchId(),
              firstName: "",
              lastName: "",
              dateOfBirth: "",
              gender: "male",
              designation: "Teacher",
              department: "",
              phone: "",
              email: "",
              address: "",
            },
      );
    }
  }, [open, staff, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit staff member" : "New joining"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this staff member's details." : "Onboard a new staff member."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="designation">Designation</Label>
              <Controller
                control={control}
                name="designation"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="designation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DESIGNATIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...register("department")} />
              {errors.department && <p className="text-xs text-red-600">{errors.department.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" rows={2} {...register("address")} />
            {errors.address && <p className="text-xs text-red-600">{errors.address.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add staff member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
