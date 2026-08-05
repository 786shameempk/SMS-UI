import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Publisher, PublisherFormValues } from "../types";

const publisherSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof publisherSchema>;

const emptyValues: FormValues = { name: "", address: "" };

export default function PublisherFormDialog({
  open,
  onOpenChange,
  publisher,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publisher?: Publisher | null;
  submitting: boolean;
  onSubmit: (values: PublisherFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(publisher);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(publisherSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(publisher ? { name: publisher.name, address: publisher.address ?? "" } : emptyValues);
  }, [open, publisher, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit publisher" : "New publisher"}</DialogTitle>
          <DialogDescription>Publishers are referenced by books in the catalog.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, address: values.address?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="pub-name">Name</Label>
            <Input id="pub-name" placeholder="e.g. Penguin Random House India" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pub-address">Address (optional)</Label>
            <Textarea id="pub-address" rows={2} {...register("address")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create publisher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
