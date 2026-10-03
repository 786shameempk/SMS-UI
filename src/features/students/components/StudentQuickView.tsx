import type { ReactNode } from "react";
import { ArrowUpRight, HeartPulse, Pencil, Phone, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/utils/format";
import type { Student } from "../types";
import { classLabel } from "../classLabel";
import StudentStatusBadge from "./StudentStatusBadge";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{children || "—"}</dd>
    </div>
  );
}


const capitalize = (v?: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : "");

/**
 * Side panel for a quick look at a student without leaving the directory. Uses only the row's own data;
 * attendance, fees and documents stay on the full profile page.
 */
export default function StudentQuickView({
  student,
  onOpenChange,
  onOpenProfile,
  onEdit,
}: {
  student: Student | null;
  onOpenChange: (open: boolean) => void;
  onOpenProfile: (s: Student) => void;
  onEdit: (s: Student) => void;
}) {
  const s = student;
  const guardians = s?.guardians ?? [];

  return (
    <Dialog open={Boolean(s)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {s && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {s.photoUrl && <AvatarImage src={s.photoUrl} alt="" />}
                  <AvatarFallback className="text-sm">{`${s.firstName[0] ?? ""}${s.lastName[0] ?? ""}`.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-0.5">
                  <DialogTitle className="truncate">
                    {s.firstName} {s.lastName}
                  </DialogTitle>
                  <DialogDescription className="truncate">
                    {[classLabel(s), s.admissionNumber].filter(Boolean).join(" • ")}
                  </DialogDescription>
                </div>
              </div>
              <div className="mt-2">
                <StudentStatusBadge status={s.status} />
              </div>
            </DialogHeader>

            <Tabs defaultValue="overview">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="guardians" className="flex-1" count={guardians.length}>
                  Guardians
                </TabsTrigger>
                <TabsTrigger value="health" className="flex-1">
                  Health
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Admission no.">{s.admissionNumber}</Field>
                  <Field label="Roll no.">{s.rollNumber}</Field>
                  <Field label="Date of birth">{s.dateOfBirth && formatDate(s.dateOfBirth)}</Field>
                  <Field label="Gender">{capitalize(s.gender)}</Field>
                  <Field label="Admitted on">{s.admissionDate && formatDate(s.admissionDate)}</Field>
                  <Field label="Transport">{s.transport?.required ? s.transport.routeName || "Required" : "Not required"}</Field>
                  <div className="col-span-2">
                    <Field label="Address">{s.address}</Field>
                  </div>
                </dl>
              </TabsContent>

              <TabsContent value="guardians" className="mt-4">
                {guardians.length === 0 ? (
                  <EmptyState size="sm" icon={Users} title="No guardians on file" description="Add a guardian from the student's details." />
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {guardians.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{g.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[capitalize(g.relation), g.occupation].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                        {g.phone && (
                          <Button asChild variant="ghost" size="sm" className="shrink-0">
                            <a href={`tel:${g.phone}`} aria-label={`Call ${g.name}`}>
                              <Phone className="h-3.5 w-3.5" />
                              <span className="tabular-nums">{g.phone}</span>
                            </a>
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="health" className="mt-4">
                {s.medical ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Blood group">{s.medical.bloodGroup}</Field>
                    <Field label="Doctor">{s.medical.doctorName}</Field>
                    <div className="col-span-2">
                      <Field label="Allergies">{s.medical.allergies}</Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="Conditions">{s.medical.conditions}</Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="Emergency contact">
                        {s.emergencyContact?.name && `${s.emergencyContact.name} (${s.emergencyContact.relation}) · ${s.emergencyContact.phone}`}
                      </Field>
                    </div>
                  </dl>
                ) : (
                  <EmptyState size="sm" icon={HeartPulse} title="No health details" description="Medical information hasn't been recorded yet." />
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => onEdit(s)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button onClick={() => onOpenProfile(s)}>
                Open full profile
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
