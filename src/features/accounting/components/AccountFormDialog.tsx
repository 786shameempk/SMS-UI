import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNT_TYPE_OPTIONS } from "../constants";
import type { Account, AccountFormValues, AccountType } from "../types";

const accountSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  type: z.enum(ACCOUNT_TYPE_OPTIONS.map((o) => o.value) as [AccountType, ...AccountType[]]),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof accountSchema>;

const emptyValues: FormValues = { code: "", name: "", type: "expense", description: "" };

export default function AccountFormDialog({
  open,
  onOpenChange,
  account,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  submitting: boolean;
  onSubmit: (values: AccountFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(account);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(accountSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(account ? { code: account.code, name: account.name, type: account.type, description: account.description ?? "" } : emptyValues);
  }, [open, account, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>Accounts are the categories every journal entry posts against.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, description: values.description?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-code" required>Code</Label>
              <Input id="acc-code" placeholder="e.g. 5060" aria-invalid={errors.code ? true : undefined} {...register("code")} />
              {errors.code && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-type" required>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="acc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-name" required>Name</Label>
            <Input id="acc-name" placeholder="e.g. Sports Equipment Expense" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-description" optional>Description</Label>
            <Textarea id="acc-description" rows={2} {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
