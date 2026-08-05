import { useEffect, useMemo, useState } from "react";
import { Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import type { SchoolClass, Section } from "../types";

export default function MergeSectionsDialog({
  open,
  onOpenChange,
  classes,
  sections,
  onMerge,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: SchoolClass[];
  sections: Section[];
  onMerge: (primarySectionId: string, secondarySectionId: string) => Promise<void>;
  submitting: boolean;
}) {
  const [classId, setClassId] = useState("");
  const [primarySectionId, setPrimarySectionId] = useState("");
  const [secondarySectionId, setSecondarySectionId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setClassId("");
      setPrimarySectionId("");
      setSecondarySectionId("");
      setConfirmOpen(false);
    }
  }, [open]);

  const sectionsInClass = useMemo(() => sections.filter((s) => s.classId === classId), [sections, classId]);
  const primarySection = sectionsInClass.find((s) => s.id === primarySectionId);
  const secondarySection = sectionsInClass.find((s) => s.id === secondarySectionId);
  const className = classes.find((c) => c.id === classId)?.name ?? "";

  const canMerge = Boolean(primarySection && secondarySection && primarySection.id !== secondarySection.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-4 h-4 text-slate-400" />
            Merge sections
          </DialogTitle>
          <DialogDescription>
            Combine two sections of the same class into one. Student records are not migrated automatically in this preview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mergeClass">Class</Label>
            <Select
              value={classId}
              onValueChange={(value) => {
                setClassId(value);
                setPrimarySectionId("");
                setSecondarySectionId("");
              }}
            >
              <SelectTrigger id="mergeClass">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="primarySection">Keep section</Label>
              <Select value={primarySectionId} onValueChange={setPrimarySectionId} disabled={!classId}>
                <SelectTrigger id="primarySection">
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsInClass.map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled={s.id === secondarySectionId}>
                      {s.name} ({s.currentStrength}/{s.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondarySection">Merge into it</Label>
              <Select value={secondarySectionId} onValueChange={setSecondarySectionId} disabled={!classId}>
                <SelectTrigger id="secondarySection">
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsInClass.map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled={s.id === primarySectionId}>
                      {s.name} ({s.currentStrength}/{s.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {canMerge && primarySection && secondarySection && (
            <p className="text-sm text-slate-600">
              {secondarySection.name} will be merged into {primarySection.name}, combining {secondarySection.currentStrength} student(s)
              and {secondarySection.capacity} seats.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canMerge} onClick={() => setConfirmOpen(true)}>
            Merge sections
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm section merge"
        description={
          primarySection && secondarySection
            ? `Merge ${secondarySection.name} into ${primarySection.name} for ${className}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Merge"
        confirmVariant="destructive"
        submitting={submitting}
        onConfirm={async () => {
          if (!primarySection || !secondarySection) return;
          await onMerge(primarySection.id, secondarySection.id);
          setConfirmOpen(false);
        }}
      />
    </Dialog>
  );
}
