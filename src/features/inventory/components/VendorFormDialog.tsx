import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Vendor, VendorFormValues } from "../types";

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof vendorSchema>;

const emptyValues: FormValues = { name: "", contactPerson: "", phone: "", email: "", address: "" };

export default function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
  submitting: boolean;
  onSubmit: (values: VendorFormValues) => Promise<void>;
}) {
  const { t } = useTranslation("inventory");
  const isEdit = Boolean(vendor);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(vendorSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      vendor
        ? {
            name: vendor.name,
            contactPerson: vendor.contactPerson ?? "",
            phone: vendor.phone ?? "",
            email: vendor.email ?? "",
            address: vendor.address ?? "",
          }
        : emptyValues,
    );
  }, [open, vendor, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Edit vendor") : t("New vendor")}</DialogTitle>
          <DialogDescription>{t("Suppliers you purchase inventory from.")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              contactPerson: values.contactPerson?.trim() || undefined,
              phone: values.phone?.trim() || undefined,
              email: values.email?.trim() || undefined,
              address: values.address?.trim() || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ven-name" required>{t("Vendor name")}</Label>
            <Input id="ven-name" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.name.message ?? "")}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ven-contactPerson">{t("Contact person")}</Label>
              <Input id="ven-contactPerson" {...register("contactPerson")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ven-phone">{t("Phone")}</Label>
              <Input id="ven-phone" {...register("phone")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ven-email">{t("Email")}</Label>
            <Input id="ven-email" type="email" aria-invalid={errors.email ? true : undefined} {...register("email")} />
            {errors.email && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.email.message ?? "")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ven-address">{t("Address")}</Label>
            <Input id="ven-address" {...register("address")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? t("Save changes") : t("Add vendor")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
