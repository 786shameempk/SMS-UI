import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentBranchId } from "@/utils/tenant";
import { listBranches } from "@/features/administration/branches/api";
import { listDepartments, listReportingOptions } from "@/features/academics/api";
import DepartmentSelect from "@/features/academics/components/DepartmentSelect";
import { listAssignableLoginRoles } from "../api";
import { DESIGNATIONS, DESIGNATION_LOGIN_ROLE, STAFF_LOGIN_ROLES } from "../constants";
import type { StaffDesignation, StaffFormValues, StaffMember } from "../types";
import { FormSection } from "@/components/ui/form-field";
import { LoginConflictError } from "@/features/login-accounts/loginConflict";

const staffFormSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  designation: z.enum(DESIGNATIONS as unknown as [StaffDesignation, ...StaffDesignation[]]),
  department: z.string().min(1, "Department is required"),
  // Either, both or neither: they decide whether (and how) the person can sign in.
  phone: z.string().refine((v) => v.trim() === "" || /^\+?[\d\s().-]{8,20}$/.test(v.trim()), "Enter a valid mobile number"),
  email: z.string().refine((v) => v.trim() === "" || z.string().email().safeParse(v.trim()).success, "Enter a valid email"),
  address: z.string().min(1, "Address is required"),
  loginRole: z.string().optional(),
  reportingToStaffId: z.string().optional(),
});

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffMember | null;
  onSubmit: (values: StaffFormValues) => Promise<void>;
  submitting: boolean;
}

export default function StaffFormDialog({ open, onOpenChange, staff, onSubmit, submitting }: StaffFormDialogProps) {
  const { t } = useTranslation("staff");
  const isEdit = Boolean(staff);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    clearErrors,
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
      loginRole: "",
      reportingToStaffId: "",
    },
  });
  // The email / mobile number is already taken: which field, and whether the person can still be saved without a sign-in account.
  const [conflict, setConflict] = useState<LoginConflictError | null>(null);
  const designation = useWatch({ control, name: "designation" });
  const loginRole = useWatch({ control, name: "loginRole" });
  const automaticRole = DESIGNATION_LOGIN_ROLE[designation];

  // Built-in staff roles and the school's custom roles; the fixed list is the fallback while it loads or if it can't.
  const { data: loginRoleOptions } = useQuery({ queryKey: ["staff", "login-roles"], queryFn: listAssignableLoginRoles, staleTime: 60_000, retry: false });
  const roleChoices = loginRoleOptions ?? STAFF_LOGIN_ROLES.map((r) => ({ key: r.value, name: t(r.label) }));
  const automaticRoleName = automaticRole ? roleChoices.find((r) => r.key === automaticRole)?.name ?? automaticRole : undefined;
  const { data: branches = [] } = useQuery({ queryKey: ["admin", "branches"], queryFn: listBranches });
  const { data: departments = [] } = useQuery({ queryKey: ["academics", "departments"], queryFn: listDepartments });
  // Chosen from the school's departments (Academic Management); a value saved earlier that is no longer listed stays selectable.
  const departmentName = useWatch({ control, name: "department" });
  const departmentId = departments.find((d) => d.name === departmentName)?.id;
  const { data: reportingOptions = [] } = useQuery({
    queryKey: ["academics", "reporting-options", staff?.id ?? "new", departmentId ?? "none"],
    queryFn: () => listReportingOptions({ staffId: staff?.id, departmentId }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setConflict(null);
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
              loginRole: "",
              reportingToStaffId: staff.reportingToStaffId ?? "",
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
              loginRole: "",
              reportingToStaffId: "",
            },
      );
    }
  }, [open, staff, reset]);

  /** Saves; a taken email / mobile number marks its field instead of just failing, and may offer to save without a sign-in account. */
  const submit = async (values: StaffFormValues, createWithoutLogin = false) => {
    setConflict(null);
    try {
      await onSubmit(createWithoutLogin ? { ...values, createWithoutLogin: true } : values);
    } catch (err) {
      if (!(err instanceof LoginConflictError)) throw err;
      setConflict(err);
      if (err.fields.email) setError("email", { type: "server", message: err.fields.email });
      if (err.fields.phone) setError("phone", { type: "server", message: err.fields.phone });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit staff member") : t("New joining")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("Update this staff member's details.") : t("Onboard a new staff member.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => submit(v))} className="space-y-6">
          <FormSection title={t("School")}>
            <div className="space-y-1.5">
              <Label htmlFor="branchId" required>{t("Branch")}</Label>
              <Controller
                control={control}
                name="branchId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="branchId">
                      <SelectValue placeholder={t("Select branch")} />
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
              {errors.branchId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.branchId.message ?? "")}</p>}
            </div>
          </FormSection>

          <FormSection title={t("Personal details")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" required>{t("First name")}</Label>
                <Input id="firstName" aria-invalid={errors.firstName ? true : undefined} {...register("firstName")} />
                {errors.firstName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.firstName.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" required>{t("Last name")}</Label>
                <Input id="lastName" aria-invalid={errors.lastName ? true : undefined} {...register("lastName")} />
                {errors.lastName && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.lastName.message ?? "")}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth" required>{t("Date of birth")}</Label>
                <Input id="dateOfBirth" type="date" aria-invalid={errors.dateOfBirth ? true : undefined} {...register("dateOfBirth")} />
                {errors.dateOfBirth && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.dateOfBirth.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender" required>{t("Gender")}</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t("Male")}</SelectItem>
                        <SelectItem value="female">{t("Female")}</SelectItem>
                        <SelectItem value="other">{t("Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title={t("Role")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="designation" required>{t("Designation")}</Label>
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
                            {t(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department" required>{t("Department")}</Label>
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => <DepartmentSelect id="department" value={field.value} onChange={field.onChange} invalid={Boolean(errors.department)} />}
                />
                {errors.department && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.department.message ?? "")}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reportingToStaffId" optional>{t("Reporting person")}</Label>
              <Controller
                control={control}
                name="reportingToStaffId"
                render={({ field }) => (
                  <Select value={field.value || "default"} onValueChange={(v) => field.onChange(v === "default" ? "" : v)}>
                    <SelectTrigger id="reportingToStaffId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{isEdit ? t("Keep as it is") : t("Department head (suggested)")}</SelectItem>
                      {reportingOptions.map((o) => (
                        <SelectItem key={o.staffId} value={o.staffId}>
                          {o.name} · {o.designation}{o.isDepartmentHead ? ` (${t("Department head")})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">{t("Their profile changes are sent to this person for approval. With none, they go to the school administrators.")}</p>
            </div>
            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="loginRole">{t("Sign-in role")}</Label>
                <Controller
                  control={control}
                  name="loginRole"
                  render={({ field }) => (
                    <Select value={field.value || "auto"} onValueChange={(v) => field.onChange(v === "auto" ? "" : v)}>
                      <SelectTrigger id="loginRole">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{automaticRoleName ? t("Automatic ({{role}})", { role: automaticRoleName }) : t("Automatic (no sign-in)")}</SelectItem>
                        {roleChoices.map((r) => (
                          <SelectItem key={r.key} value={r.key}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {loginRole || automaticRole
                    ? t("A sign-in is created for the email below and an invitation to set a password is sent.")
                    : t("This designation has no sign-in of its own. Pick a sign-in role to give them access.")}
                </p>
              </div>
            )}
          </FormSection>

          <FormSection title={t("Contact")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" optional>{t("Mobile number")}</Label>
                <Input id="phone" type="tel" inputMode="tel" aria-invalid={errors.phone ? true : undefined} {...register("phone", { onChange: () => clearErrors("phone") })} />
                {errors.phone && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.phone.message ?? "")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" optional>{t("Email")}</Label>
                <Input id="email" type="email" aria-invalid={errors.email ? true : undefined} {...register("email", { onChange: () => clearErrors("email") })} />
                {errors.email && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.email.message ?? "")}</p>}
              </div>
            </div>

            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                {t("Give an email, a mobile number or both. An email gets an invitation to set a password; a mobile number signs in with a one-time code. With neither, no sign-in account is created.")}
              </p>
            )}
            {conflict?.canSkipLogin && (
              <div role="alert" className="rounded-md border border-warning/40 bg-warning-soft p-3 text-sm text-warning-strong space-y-2">
                <p>{t("This email or mobile number already has a sign-in account, so it can't be given to a new staff member. Change it, or save the person without a sign-in account.")}</p>
                <Button type="button" size="sm" variant="outline" loading={submitting} onClick={handleSubmit((v) => submit(v, true))}>
                  {t("Save without a sign-in account")}
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="address" required>{t("Address")}</Label>
              <Textarea id="address" rows={2} aria-invalid={errors.address ? true : undefined} {...register("address")} />
              {errors.address && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.address.message ?? "")}</p>}
            </div>
          </FormSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : t("Add staff member")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
