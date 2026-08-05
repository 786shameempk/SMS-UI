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
import type { Author, AuthorFormValues } from "../types";

const authorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
});

type FormValues = z.infer<typeof authorSchema>;

const emptyValues: FormValues = { name: "", bio: "" };

export default function AuthorFormDialog({
  open,
  onOpenChange,
  author,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author?: Author | null;
  submitting: boolean;
  onSubmit: (values: AuthorFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(author);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(authorSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(author ? { name: author.name, bio: author.bio ?? "" } : emptyValues);
  }, [open, author, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit author" : "New author"}</DialogTitle>
          <DialogDescription>Authors are referenced by books in the catalog.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, bio: values.bio?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="auth-name">Name</Label>
            <Input id="auth-name" placeholder="e.g. R.K. Narayan" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-bio">Bio (optional)</Label>
            <Textarea id="auth-bio" rows={3} {...register("bio")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create author"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
