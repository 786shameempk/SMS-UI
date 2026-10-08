import { useMemo, useState } from "react";
import { GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleChip } from "@/components/ui/toggle-chip";
import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import { groupStudentsByClass, isCurrentStaff, planBulkAdd } from "../bulk";
import type { LibraryMember } from "../types";

interface BulkMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  staff: StaffMember[];
  members: LibraryMember[];
  submitting: boolean;
  onSubmit: (people: { personType: "student" | "staff"; personId: string }[]) => Promise<void>;
}

/** Enrols whole classes of students and/or all current staff in one go. People who are already members are skipped. */
/** The parent gives it a new `key` each time it opens, so the choices always start empty. */
export default function BulkMembersDialog({ open, onOpenChange, students, staff, members, submitting, onSubmit }: BulkMembersDialogProps) {
  const [classKeys, setClassKeys] = useState<string[]>([]);
  const [allStaff, setAllStaff] = useState(false);

  const classes = useMemo(() => groupStudentsByClass(students), [students]);
  const currentStaff = useMemo(() => staff.filter(isCurrentStaff), [staff]);
  const plan = useMemo(() => planBulkAdd({ students, staff, members, selection: { classKeys, allStaff } }), [students, staff, members, classKeys, allStaff]);

  const toggleClass = (key: string) => setClassKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  const allClassesChosen = classes.length > 0 && classKeys.length === classes.length;

  const summary =
    plan.people.length === 0 && plan.alreadyMembers === 0
      ? "Choose classes or staff to add."
      : [
          plan.newStudents > 0 ? `${plan.newStudents} ${plan.newStudents === 1 ? "student" : "students"}` : null,
          plan.newStaff > 0 ? `${plan.newStaff} staff` : null,
        ]
          .filter(Boolean)
          .join(" and ")
          .replace(/^$/, "Nobody new");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add library members in bulk</DialogTitle>
          <DialogDescription>Enrol whole classes and all staff at once. Anyone who is already a member is left as they are.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2" aria-labelledby="bulk-students">
            <div className="flex items-center justify-between gap-2">
              <h3 id="bulk-students" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Students by class
              </h3>
              {classes.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setClassKeys(allClassesChosen ? [] : classes.map((c) => c.key))}>
                  {allClassesChosen ? "Clear" : "Select all classes"}
                </Button>
              )}
            </div>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active students yet.</p>
            ) : (
              <div role="group" aria-label="Classes" className="flex flex-wrap gap-1.5">
                {classes.map((c) => (
                  <ToggleChip key={c.key} size="lg" pressed={classKeys.includes(c.key)} onClick={() => toggleClass(c.key)}>
                    {c.key}
                    <span className="text-muted-foreground">{c.students.length}</span>
                  </ToggleChip>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2" aria-labelledby="bulk-staff">
            <h3 id="bulk-staff" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              Staff
            </h3>
            <ToggleChip size="lg" pressed={allStaff} disabled={currentStaff.length === 0} onClick={() => setAllStaff((v) => !v)}>
              All current staff
              <span className="text-muted-foreground">{currentStaff.length}</span>
            </ToggleChip>
          </section>

          <p role="status" className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground">
            {plan.people.length > 0 ? <>Will add {summary}.</> : summary}
            {plan.alreadyMembers > 0 && <span className="text-muted-foreground"> {plan.alreadyMembers} already {plan.alreadyMembers === 1 ? "a member" : "members"}, skipped.</span>}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" loading={submitting} disabled={plan.people.length === 0} onClick={() => void onSubmit(plan.people)}>
            {plan.people.length > 0 ? `Add ${plan.people.length} ${plan.people.length === 1 ? "member" : "members"}` : "Add members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
