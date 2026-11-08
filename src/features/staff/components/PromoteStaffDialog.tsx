import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEGACY_ROLE, resolveRole, roleKeyFor, useStaffRoles } from "../useStaffRoles";
import { roleLabel } from "../constants";
import type { PromoteStaffFormValues, StaffMember } from "../types";

const promoteFormSchema = z.object({
  roleKey: z.string().min(1, "Select a role"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  remarks: z.string().optional(),
});

type PromoteFormShape = z.infer<typeof promoteFormSchema>;

export default function PromoteStaffDialog({
  open,
  onOpenChange,
  staff,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSubmit: (values: PromoteStaffFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation("staff");
  const roles = useStaffRoles();
  const legacy = staff && !staff.roleTitle && roleKeyFor(staff, roles).startsWith(LEGACY_ROLE) ? staff : null;
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PromoteFormShape>({
    resolver: zodResolver(promoteFormSchema),
    defaultValues: { roleKey: "teacher", effectiveDate: "", remarks: "" },
  });

  useEffect(() => {
    if (open) reset({ roleKey: staff ? roleKeyFor(staff, roles) : "teacher", effectiveDate: "", remarks: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the role list is read once, when the dialog opens
  }, [open, staff, reset]);

  const submit = (v: PromoteFormShape) => {
    const { designation, roleTitle } = resolveRole(v.roleKey, roles, staff?.roleTitle);
    return onSubmit({ toDesignation: designation, roleTitle, effectiveDate: v.effectiveDate, remarks: v.remarks });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Promote staff member")}</DialogTitle>
          <DialogDescription>
            {staff ? t("Change {{name}}'s role.", { name: `${staff.firstName} ${staff.lastName}` }) : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="roleKey" required>{t("New role")}</Label>
            <Controller
              control={control}
              name="roleKey"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="roleKey">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.key} value={r.key}>
                        {r.name}
                      </SelectItem>
                    ))}
                    {legacy && <SelectItem value={LEGACY_ROLE + legacy.designation}>{t(roleLabel(legacy))}</SelectItem>}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="effectiveDate" required>{t("Effective date")}</Label>
            <Input id="effectiveDate" type="date" aria-invalid={errors.effectiveDate ? true : undefined} {...register("effectiveDate")} />
            {errors.effectiveDate && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.effectiveDate.message ?? "")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="remarks" optional>{t("Remarks")}</Label>
            <Textarea id="remarks" rows={2} {...register("remarks")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {t("Promote")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
