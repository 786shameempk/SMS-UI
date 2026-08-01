import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { GUARDIAN_RELATIONS } from "../../constants";
import { updateEmergencyContact, updateGuardians } from "../../api";
import type { EmergencyContact, GuardianDetails, Student } from "../../types";

const guardianSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relation: z.enum(["father", "mother", "guardian"]),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().optional(),
  occupation: z.string().optional(),
});
type GuardianFormValues = z.infer<typeof guardianSchema>;

function GuardianFormDialog({
  open,
  onOpenChange,
  guardian,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardian?: GuardianDetails | null;
  onSubmit: (values: GuardianFormValues) => void;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianSchema),
    defaultValues: { name: "", relation: "father", phone: "", email: "", occupation: "" },
  });

  useEffect(() => {
    if (open) {
      reset(
        guardian
          ? { name: guardian.name, relation: guardian.relation, phone: guardian.phone, email: guardian.email ?? "", occupation: guardian.occupation ?? "" }
          : { name: "", relation: "father", phone: "", email: "", occupation: "" },
      );
    }
  }, [open, guardian, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{guardian ? "Edit guardian" : "Add guardian"}</DialogTitle>
          <DialogDescription>Guardian and parent contact details for this student.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-name">Name</Label>
            <Input id="g-name" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-relation">Relation</Label>
              <Controller
                control={control}
                name="relation"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="g-relation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GUARDIAN_RELATIONS.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-phone">Phone</Label>
              <Input id="g-phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-email">Email (optional)</Label>
              <Input id="g-email" type="email" {...register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-occupation">Occupation (optional)</Label>
              <Input id="g-occupation" {...register("occupation")} />
            </div>
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

export default function GuardianEmergencyTab({ student }: { student: Student }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<GuardianDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuardianDetails | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    queryClient.invalidateQueries({ queryKey: ["students", student.id] });
  };

  const guardiansMutation = useMutation({
    mutationFn: (guardians: GuardianDetails[]) => updateGuardians(student.id, guardians),
    onSuccess: () => {
      invalidate();
      toast.success("Guardian details saved");
      setFormOpen(false);
      setEditingGuardian(null);
      setDeleteTarget(null);
    },
  });

  const handleSaveGuardian = (values: GuardianFormValues) => {
    const next = editingGuardian
      ? student.guardians.map((g) => (g.id === editingGuardian.id ? { ...g, ...values } : g))
      : [...student.guardians, { id: `g-${Math.random().toString(36).slice(2, 8)}`, ...values }];
    guardiansMutation.mutate(next);
  };

  const handleDeleteGuardian = () => {
    if (!deleteTarget) return;
    guardiansMutation.mutate(student.guardians.filter((g) => g.id !== deleteTarget.id));
  };

  const {
    register: registerEmergency,
    handleSubmit: handleSubmitEmergency,
    formState: { isDirty: emergencyDirty },
  } = useForm<EmergencyContact>({ defaultValues: student.emergencyContact });

  const emergencyMutation = useMutation({
    mutationFn: (contact: EmergencyContact) => updateEmergencyContact(student.id, contact),
    onSuccess: () => {
      invalidate();
      toast.success("Emergency contact saved");
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Guardians</CardTitle>
            <CardDescription>Parents or guardians associated with this student.</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingGuardian(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add guardian
          </Button>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {student.guardians.length === 0 && <p className="text-sm text-muted-foreground">No guardians on file.</p>}
          {student.guardians.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {g.name} <span className="text-slate-400 font-normal capitalize">&middot; {g.relation}</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {g.phone}
                    {g.email ? ` · ${g.email}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingGuardian(g);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteTarget(g)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            Emergency contact
          </CardTitle>
          <CardDescription>Who to reach first in a medical or safety emergency.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmitEmergency((values) => emergencyMutation.mutate(values))}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Name</Label>
              <Input id="e-name" {...registerEmergency("name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-relation">Relation</Label>
              <Input id="e-relation" {...registerEmergency("relation")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-phone">Phone</Label>
              <Input id="e-phone" {...registerEmergency("phone")} />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" size="sm" disabled={!emergencyDirty || emergencyMutation.isPending}>
                {emergencyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save emergency contact
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <GuardianFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingGuardian(null);
        }}
        guardian={editingGuardian}
        submitting={guardiansMutation.isPending}
        onSubmit={handleSaveGuardian}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove guardian"
        description={`Remove ${deleteTarget?.name} from this student's guardian list?`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={guardiansMutation.isPending}
        onConfirm={handleDeleteGuardian}
      />
    </div>
  );
}
