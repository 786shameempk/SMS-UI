import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatCurrency } from "@/utils/format";
import { createPlan, deletePlan, listPlans, updatePlan } from "../api";
import type { Plan } from "../types";
import PlanFormDialog from "./PlanFormDialog";

export default function PlansTab() {
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({ queryKey: ["platform", "plans"], queryFn: listPlans });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["platform"] });

  const createMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      invalidate();
      toast.success("Plan created");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof updatePlan>[1] }) => updatePlan(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Plan updated");
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      invalidate();
      toast.success("Plan deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete plan"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">The plan catalog tenants subscribe to.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant="info">{plan.tier}</Badge>
              </div>
              <CardDescription>{formatCurrency(plan.monthlyPriceInr)} / month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-secondary-foreground space-y-1">
                <p>Up to {plan.maxStudents.toLocaleString()} students</p>
                <p>Up to {plan.maxStaff.toLocaleString()} staff</p>
                <p>{plan.storageGb} GB storage</p>
                <p>{plan.includedModules.length} modules included</p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(plan);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive-strong hover:text-destructive-strong" onClick={() => setDeleteTarget(plan)}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PlanFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        plan={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete plan"
        description={`Delete the "${deleteTarget?.name}" plan? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
