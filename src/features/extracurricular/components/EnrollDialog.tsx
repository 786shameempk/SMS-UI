import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { useStudentOptions } from "../shared";
import type { Activity } from "../types";

/** Ask for a place (a parent or student) or put a student in (staff). The server decides whether it is approved, requested or waitlisted. */
export default function EnrollDialog({
  open,
  onOpenChange,
  activity,
  isFamily,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  isFamily: boolean;
  submitting: boolean;
  onSubmit: (values: { studentId: string; note: string | null; consentGiven: boolean }) => Promise<void>;
}) {
  const students = useStudentOptions(open);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setConsent(false);
    setTouched(false);
    setStudentId(null);
  }, [open]);

  // A family with one child needs no choosing.
  useEffect(() => {
    if (open && isFamily && students.options.length === 1) setStudentId(students.options[0].value);
  }, [open, isFamily, students.options]);

  const needsConsent = Boolean(activity?.requiresConsent);
  const missingStudent = touched && !studentId;
  const missingConsent = touched && needsConsent && !consent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isFamily ? "Ask to join" : "Enroll a student"}</DialogTitle>
          <DialogDescription>
            {activity?.name}
            {activity?.requiresApproval && isFamily ? " — a coordinator will approve the request." : ""}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!studentId || (needsConsent && !consent)) return;
            void onSubmit({ studentId, note: note.trim() || null, consentGiven: consent });
          }}
        >
          <FormField label="Student" htmlFor="enroll-student" required error={missingStudent ? "Choose a student" : undefined}>
            <Combobox
              aria-label="Student"
              value={studentId}
              onValueChange={setStudentId}
              options={students.options}
              placeholder={students.isLoading ? "Loading…" : "Choose a student"}
              searchPlaceholder="Search by name or admission number"
            />
          </FormField>
          {activity?.safetyNotes && (
            <div className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-strong">
              <p className="font-medium">Safety</p>
              <p>{activity.safetyNotes}</p>
            </div>
          )}
          {needsConsent && (
            <FormField error={missingConsent ? "Consent is required for this activity" : undefined}>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} aria-label="Parental consent" className="mt-0.5" />
                <span>I am the student's parent or guardian and I consent to their taking part in this activity.</span>
              </label>
            </FormField>
          )}
          <FormField label="Note" htmlFor="enroll-note" optional>
            <Textarea id="enroll-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isFamily ? "Send request" : "Enroll"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
