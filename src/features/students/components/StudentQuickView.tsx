import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
  /** Omit for read-only viewers (teachers): the Edit button is hidden. */
  onEdit?: (s: Student) => void;
}) {
  const { t } = useTranslation("students");
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
                  {t("Overview")}
                </TabsTrigger>
                <TabsTrigger value="guardians" className="flex-1" count={guardians.length}>
                  {t("Guardians")}
                </TabsTrigger>
                <TabsTrigger value="health" className="flex-1">
                  {t("Health")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label={t("Admission no.")}>{s.admissionNumber}</Field>
                  <Field label={t("Roll no.")}>{s.rollNumber}</Field>
                  <Field label={t("Date of birth")}>{s.dateOfBirth && formatDate(s.dateOfBirth)}</Field>
                  <Field label={t("Gender")}>{s.gender ? t(capitalize(s.gender)) : ""}</Field>
                  <Field label={t("Admitted on")}>{s.admissionDate && formatDate(s.admissionDate)}</Field>
                  <Field label={t("Transport")}>{s.transport?.required ? s.transport.routeName || t("Required") : t("Not required")}</Field>
                  <div className="col-span-2">
                    <Field label={t("Address")}>{s.address}</Field>
                  </div>
                </dl>
              </TabsContent>

              <TabsContent value="guardians" className="mt-4">
                {guardians.length === 0 ? (
                  <EmptyState size="sm" icon={Users} title={t("No guardians on file")} description={t("Add a guardian from the student's details.")} />
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {guardians.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{g.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[g.relation ? t(capitalize(g.relation)) : "", g.occupation].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                        {g.phone && (
                          <Button asChild variant="ghost" size="sm" className="shrink-0">
                            <a href={`tel:${g.phone}`} aria-label={t("Call {{name}}", { name: g.name })}>
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
                    <Field label={t("Blood group")}>{s.medical.bloodGroup}</Field>
                    <Field label={t("Doctor")}>{s.medical.doctorName}</Field>
                    <div className="col-span-2">
                      <Field label={t("Allergies")}>{s.medical.allergies}</Field>
                    </div>
                    <div className="col-span-2">
                      <Field label={t("Conditions")}>{s.medical.conditions}</Field>
                    </div>
                    <div className="col-span-2">
                      <Field label={t("Emergency contact")}>
                        {s.emergencyContact?.name && `${s.emergencyContact.name} (${s.emergencyContact.relation}) · ${s.emergencyContact.phone}`}
                      </Field>
                    </div>
                  </dl>
                ) : (
                  <EmptyState size="sm" icon={HeartPulse} title={t("No health details")} description={t("Medical information hasn't been recorded yet.")} />
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              {onEdit && (
                <Button variant="outline" onClick={() => onEdit(s)}>
                  <Pencil className="h-4 w-4" />
                  {t("Edit")}
                </Button>
              )}
              <Button onClick={() => onOpenProfile(s)}>
                {t("Open full profile")}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
