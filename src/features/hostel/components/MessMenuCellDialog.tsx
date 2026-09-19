import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MessMenuEntry } from "../types";

const menuSchema = z.object({
  items: z.string().min(1, "Enter at least one menu item"),
});

type FormValues = z.infer<typeof menuSchema>;

export default function MessMenuCellDialog({
  open,
  onOpenChange,
  entry,
  dayLabel,
  mealLabel,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: MessMenuEntry | null;
  dayLabel: string;
  mealLabel: string;
  submitting: boolean;
  onSubmit: (items: string) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(menuSchema), defaultValues: { items: "" } });

  useEffect(() => {
    if (open) reset({ items: entry?.items ?? "" });
  }, [open, entry, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {dayLabel} · {mealLabel}
          </DialogTitle>
          <DialogDescription>Edit the menu items served for this meal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit(values.items.trim()))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="menu-items">Menu items</Label>
            <Textarea id="menu-items" rows={3} placeholder="e.g. Idli & sambar" {...register("items")} />
            {errors.items && <p className="text-xs text-red-600">{errors.items.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
