import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentBranchId } from "@/utils/tenant";
import { listBranches } from "@/features/administration/branches/api";
import type { Role } from "@/features/administration/roles/types";
import type { SystemUser, UserFormValues } from "../types";

const userFormSchema = z.object({
  branchId: z.string().nullable(),
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().optional(),
  roleId: z.string().min(1, "Select a role"),
  department: z.string().optional(),
});

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: SystemUser | null;
  roles: Role[];
  onSubmit: (values: UserFormValues) => Promise<void>;
  submitting: boolean;
}

export default function UserFormDialog({ open, onOpenChange, user, roles, onSubmit, submitting }: UserFormDialogProps) {
  const { t } = useTranslation("administration");
  const isEdit = Boolean(user);
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { branchId: getCurrentBranchId(), name: "", email: "", phone: "", roleId: "", department: "" },
  });

  const { data: branches = [] } = useQuery({ queryKey: ["admin", "branches"], queryFn: listBranches });

  useEffect(() => {
    if (open) {
      reset(
        user
          ? { branchId: user.branchId, name: user.name, email: user.email, phone: user.phone ?? "", roleId: user.roleId, department: user.department ?? "" }
          : { branchId: getCurrentBranchId(), name: "", email: "", phone: "", roleId: "", department: "" },
      );
    }
  }, [open, user, reset]);

  const roleId = watch("roleId");
  const selectedRole = roles.find((r) => r.id === roleId);
  const needsBranch = !selectedRole?.grantsAllBranchAccess;

  useEffect(() => {
    if (!needsBranch) setValue("branchId", null);
    else if (watch("branchId") === null) setValue("branchId", getCurrentBranchId());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsBranch]);

  const submit = async (values: UserFormValues) => {
    if (needsBranch && !values.branchId) {
      setError("branchId", { message: "Select a branch" });
      return;
    }
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit user") : t("Add user")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("Update this user's account details.") : t("Create a new user account for staff or administration.")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" required>{t("Full name")}</Label>
            <Input id="name" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.name.message ?? "")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" required>{t("Email")}</Label>
            <Input id="email" type="email" aria-invalid={errors.email ? true : undefined} {...register("email")} />
            {errors.email && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.email.message ?? "")}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("Phone")}</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">{t("Department")}</Label>
              <Input id="department" {...register("department")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roleId" required>{t("Role")}</Label>
            <Controller
              control={control}
              name="roleId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="roleId">
                    <SelectValue placeholder={t("Select a role")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.roleId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.roleId.message ?? "")}</p>}
          </div>

          {needsBranch && (
            <div className="space-y-1.5">
              <Label htmlFor="branchId">{t("Branch")}</Label>
              <Controller
                control={control}
                name="branchId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
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
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : t("Create user")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
