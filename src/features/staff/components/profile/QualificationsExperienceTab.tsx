import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, GraduationCap, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { addExperience, addQualification, removeExperience, removeQualification } from "../../api";
import type { ExperienceFormValues, QualificationFormValues, StaffMember } from "../../types";

const qualificationSchema = z.object({
  degree: z.string().min(1, "Degree is required"),
  institution: z.string().min(1, "Institution is required"),
  yearCompleted: z.coerce.number().min(1950).max(2100),
});

const experienceSchema = z.object({
  organization: z.string().min(1, "Organization is required"),
  role: z.string().min(1, "Role is required"),
  fromYear: z.coerce.number().min(1950).max(2100),
  toYear: z.coerce.number().min(1950).max(2100).optional(),
  description: z.string().optional(),
});

function QualificationFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: QualificationFormValues) => void;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QualificationFormValues>({
    resolver: zodResolver(qualificationSchema),
    defaultValues: { degree: "", institution: "", yearCompleted: new Date().getFullYear() },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add qualification</DialogTitle>
          <DialogDescription>Educational qualification on file for this staff member.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => {
            onSubmit(values);
            reset();
          })}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="degree">Degree</Label>
            <Input id="degree" {...register("degree")} />
            {errors.degree && <p className="text-xs text-red-600">{errors.degree.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="institution">Institution</Label>
            <Input id="institution" {...register("institution")} />
            {errors.institution && <p className="text-xs text-red-600">{errors.institution.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yearCompleted">Year completed</Label>
            <Input id="yearCompleted" type="number" {...register("yearCompleted")} />
            {errors.yearCompleted && <p className="text-xs text-red-600">{errors.yearCompleted.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExperienceFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExperienceFormValues) => void;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: { organization: "", role: "", fromYear: new Date().getFullYear(), toYear: undefined, description: "" },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add experience</DialogTitle>
          <DialogDescription>Prior work experience on file for this staff member.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => {
            onSubmit(values);
            reset();
          })}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="organization">Organization</Label>
            <Input id="organization" {...register("organization")} />
            {errors.organization && <p className="text-xs text-red-600">{errors.organization.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Input id="role" {...register("role")} />
            {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fromYear">From year</Label>
              <Input id="fromYear" type="number" {...register("fromYear")} />
              {errors.fromYear && <p className="text-xs text-red-600">{errors.fromYear.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toYear">To year (optional)</Label>
              <Input id="toYear" type="number" {...register("toYear")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function QualificationsExperienceTab({ staff }: { staff: StaffMember }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    queryClient.invalidateQueries({ queryKey: ["staff", staff.id] });
  };

  const [qualFormOpen, setQualFormOpen] = useState(false);
  const [expFormOpen, setExpFormOpen] = useState(false);
  const [deleteQualId, setDeleteQualId] = useState<string | null>(null);
  const [deleteExpId, setDeleteExpId] = useState<string | null>(null);

  const addQualMutation = useMutation({
    mutationFn: (values: QualificationFormValues) => addQualification(staff.id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Qualification added");
      setQualFormOpen(false);
    },
  });
  const removeQualMutation = useMutation({
    mutationFn: (qualificationId: string) => removeQualification(staff.id, qualificationId),
    onSuccess: () => {
      invalidate();
      toast.success("Qualification removed");
      setDeleteQualId(null);
    },
  });
  const addExpMutation = useMutation({
    mutationFn: (values: ExperienceFormValues) => addExperience(staff.id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Experience added");
      setExpFormOpen(false);
    },
  });
  const removeExpMutation = useMutation({
    mutationFn: (experienceId: string) => removeExperience(staff.id, experienceId),
    onSuccess: () => {
      invalidate();
      toast.success("Experience removed");
      setDeleteExpId(null);
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            Qualifications
          </CardTitle>
          <Button size="sm" onClick={() => setQualFormOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.qualifications.length === 0 && <p className="text-sm text-muted-foreground">No qualifications on file.</p>}
          {staff.qualifications.map((q) => (
            <div key={q.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{q.degree}</p>
                <p className="text-xs text-slate-500">
                  {q.institution} &middot; {q.yearCompleted}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteQualId(q.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            Experience
          </CardTitle>
          <Button size="sm" onClick={() => setExpFormOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.experience.length === 0 && <p className="text-sm text-muted-foreground">No prior experience on file.</p>}
          {staff.experience.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {e.role} &middot; {e.organization}
                </p>
                <p className="text-xs text-slate-500">
                  {e.fromYear} - {e.toYear ?? "Present"}
                  {e.description ? ` · ${e.description}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteExpId(e.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <QualificationFormDialog
        open={qualFormOpen}
        onOpenChange={setQualFormOpen}
        submitting={addQualMutation.isPending}
        onSubmit={(values) => addQualMutation.mutate(values)}
      />
      <ExperienceFormDialog
        open={expFormOpen}
        onOpenChange={setExpFormOpen}
        submitting={addExpMutation.isPending}
        onSubmit={(values) => addExpMutation.mutate(values)}
      />
      <ConfirmDialog
        open={Boolean(deleteQualId)}
        onOpenChange={(v) => !v && setDeleteQualId(null)}
        title="Remove qualification"
        description="This will remove the qualification from this staff member's record."
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={removeQualMutation.isPending}
        onConfirm={() => {
          if (deleteQualId) removeQualMutation.mutate(deleteQualId);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteExpId)}
        onOpenChange={(v) => !v && setDeleteExpId(null)}
        title="Remove experience"
        description="This will remove the experience entry from this staff member's record."
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={removeExpMutation.isPending}
        onConfirm={() => {
          if (deleteExpId) removeExpMutation.mutate(deleteExpId);
        }}
      />
    </div>
  );
}
