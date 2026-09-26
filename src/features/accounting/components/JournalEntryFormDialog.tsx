import { useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/utils/format";
import type { Account, JournalEntryFormValues } from "../types";

const numeric = (v: unknown) => (v === "" || v === undefined || v === null ? 0 : v);

const lineSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  debit: z.preprocess(numeric, z.coerce.number().min(0)),
  credit: z.preprocess(numeric, z.coerce.number().min(0)),
  description: z.string().optional(),
});

const entrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  narration: z.string().min(1, "Narration is required"),
  gstApplicable: z.boolean(),
  gstAmount: z.preprocess(numeric, z.coerce.number().min(0).optional()),
  lines: z.array(lineSchema).min(2, "Add at least two lines"),
});

type FormValues = z.infer<typeof entrySchema>;

const emptyLine = { accountId: "", debit: 0, credit: 0, description: "" };
const emptyValues: FormValues = {
  date: new Date().toISOString().slice(0, 10),
  reference: "",
  narration: "",
  gstApplicable: false,
  gstAmount: 0,
  lines: [{ ...emptyLine }, { ...emptyLine }],
};

export default function JournalEntryFormDialog({
  open,
  onOpenChange,
  accounts,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  submitting: boolean;
  onSubmit: (values: JournalEntryFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(entrySchema), defaultValues: emptyValues });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const lines = useWatch({ control, name: "lines" });
  const gstApplicable = useWatch({ control, name: "gstApplicable" });
  const { totalDebit, totalCredit } = useMemo(() => {
    return (lines ?? []).reduce(
      (acc, l) => ({ totalDebit: acc.totalDebit + (Number(l?.debit) || 0), totalCredit: acc.totalCredit + (Number(l?.credit) || 0) }),
      { totalDebit: 0, totalCredit: 0 },
    );
  }, [lines]);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>New journal entry</DialogTitle>
          <DialogDescription>Every entry is created as a draft — post it once you're ready for it to hit the ledger.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({
              ...values,
              reference: values.reference?.trim() || undefined,
              gstAmount: values.gstApplicable ? values.gstAmount : undefined,
              lines: values.lines.map((l) => ({ ...l, description: l.description?.trim() || undefined })),
            }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="je-date" required>Date</Label>
              <Input id="je-date" type="date" aria-invalid={errors.date ? true : undefined} {...register("date")} />
              {errors.date && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="je-reference" optional>Reference</Label>
              <Input id="je-reference" placeholder="e.g. invoice or voucher no." {...register("reference")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="je-narration" required>Narration</Label>
            <Textarea id="je-narration" rows={2} aria-invalid={errors.narration ? true : undefined} {...register("narration")} />
            {errors.narration && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.narration.message}</p>}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">GST applicable</p>
              <p className="text-xs text-muted-foreground">Tag this entry for the GST summary report.</p>
            </div>
            <Controller control={control} name="gstApplicable" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
          </div>

          {gstApplicable && (
            <div className="space-y-1.5">
              <Label htmlFor="je-gstAmount">Tax amount</Label>
              <Input id="je-gstAmount" type="number" min="0" step="1" {...register("gstAmount")} />
              <p className="text-xs text-muted-foreground">Include this amount as one of the lines below (e.g. GST Payable or GST Input Credit).</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Lines</Label>
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_100px_100px_28px] gap-2 items-start">
                <Controller
                  control={control}
                  name={`lines.${i}.accountId`}
                  render={({ field: f }) => (
                    <Select value={f.value} onValueChange={f.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} · {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input type="number" min="0" step="1" placeholder="Debit" {...register(`lines.${i}.debit`)} />
                <Input type="number" min="0" step="1" placeholder="Credit" {...register(`lines.${i}.credit`)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={fields.length <= 2}
                  onClick={() => remove(i)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {typeof errors.lines?.message === "string" && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.lines.message}</p>}

            <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyLine })}>
              <Plus className="w-3.5 h-3.5" />
              Add line
            </Button>
          </div>

          <div className={`flex items-center justify-between rounded-lg border p-3 text-sm ${isBalanced ? "border-success/30 bg-success-soft" : "border-warning/30 bg-warning-soft"}`}>
            <span className="text-secondary-foreground">
              Debit {formatCurrency(totalDebit)} &middot; Credit {formatCurrency(totalCredit)}
            </span>
            <span className={isBalanced ? "text-success-strong font-medium" : "text-warning-strong font-medium"}>
              {isBalanced ? "Balanced" : "Not balanced"}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !isBalanced}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save as draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
