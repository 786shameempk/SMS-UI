import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { CERTIFICATE_TYPE_OPTIONS } from "../constants";
import {
  generateAchievementCertificate,
  generateBonafide,
  generateCharacterCertificate,
  generateStaffServiceCertificate,
  generateStudyCertificate,
  generateTransferCertificate,
} from "../api";
import type { CertificateType, IssuedCertificate } from "../types";
import CertificateView from "./CertificateView";

const certSchema = z
  .object({
    type: z.enum(["bonafide", "transfer", "character", "study", "achievement", "staff_service"] as [CertificateType, ...CertificateType[]]),
    studentId: z.string().optional(),
    staffId: z.string().optional(),
    purpose: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    event: z.string().optional(),
    achievement: z.string().optional(),
    eventDate: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const needsStudent = values.type !== "staff_service";
    if (needsStudent && !values.studentId) ctx.addIssue({ code: "custom", path: ["studentId"], message: "Select a student" });
    if (values.type === "staff_service" && !values.staffId) ctx.addIssue({ code: "custom", path: ["staffId"], message: "Select a staff member" });
    if (values.type === "study") {
      if (!values.fromDate) ctx.addIssue({ code: "custom", path: ["fromDate"], message: "Start date is required" });
      if (!values.toDate) ctx.addIssue({ code: "custom", path: ["toDate"], message: "End date is required" });
    }
    if (values.type === "achievement") {
      if (!values.event?.trim()) ctx.addIssue({ code: "custom", path: ["event"], message: "Event name is required" });
      if (!values.achievement?.trim()) ctx.addIssue({ code: "custom", path: ["achievement"], message: "Achievement is required" });
      if (!values.eventDate) ctx.addIssue({ code: "custom", path: ["eventDate"], message: "Event date is required" });
    }
  });

type FormValues = z.infer<typeof certSchema>;

const emptyValues: FormValues = {
  type: "bonafide",
  studentId: "",
  staffId: "",
  purpose: "",
  fromDate: "",
  toDate: "",
  event: "",
  achievement: "",
  eventDate: "",
};

export default function GenerateCertificateTab() {
  const queryClient = useQueryClient();
  const [issued, setIssued] = useState<IssuedCertificate | null>(null);

  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(certSchema), defaultValues: emptyValues });

  const type = watch("type");
  const studentId = watch("studentId");
  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId), [students, studentId]);
  const typeConfig = CERTIFICATE_TYPE_OPTIONS.find((o) => o.type === type)!;

  const generateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      switch (values.type) {
        case "bonafide":
          return generateBonafide({ studentId: values.studentId!, purpose: values.purpose });
        case "transfer":
          return generateTransferCertificate({ studentId: values.studentId! });
        case "character":
          return generateCharacterCertificate({ studentId: values.studentId!, purpose: values.purpose });
        case "study":
          return generateStudyCertificate({ studentId: values.studentId!, fromDate: values.fromDate!, toDate: values.toDate!, purpose: values.purpose });
        case "achievement":
          return generateAchievementCertificate({
            studentId: values.studentId!,
            event: values.event!,
            achievement: values.achievement!,
            eventDate: values.eventDate!,
          });
        case "staff_service":
          return generateStaffServiceCertificate({ staffId: values.staffId!, purpose: values.purpose });
      }
    },
    onSuccess: (certificate) => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success(`${certificate.certificateNumber} generated`);
      reset({ ...emptyValues, type: type });
      setIssued(certificate);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not generate certificate"),
  });

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate a certificate</CardTitle>
          <CardDescription>{typeConfig.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => generateMutation.mutate(values))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cert-type">Certificate type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      reset({ ...emptyValues, type: v as CertificateType });
                    }}
                  >
                    <SelectTrigger id="cert-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CERTIFICATE_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.type} value={o.type}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {typeConfig.recipientType === "student" ? (
              <div className="space-y-1.5">
                <Label htmlFor="cert-studentId">Student</Label>
                <Controller
                  control={control}
                  name="studentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="cert-studentId">
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} · {s.className} - {s.section} ({s.admissionNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.studentId && <p className="text-xs text-red-600">{errors.studentId.message}</p>}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="cert-staffId">Staff member</Label>
                <Controller
                  control={control}
                  name="staffId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="cert-staffId">
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} · {s.designation} ({s.employeeId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.staffId && <p className="text-xs text-red-600">{errors.staffId.message}</p>}
              </div>
            )}

            {type === "transfer" && studentId && (
              <p
                className={`text-xs rounded-md border px-2.5 py-2 ${
                  selectedStudent?.transferRecord ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {selectedStudent?.transferRecord
                  ? `Transferring to ${selectedStudent.transferRecord.toSchool}, TC number ${selectedStudent.transferRecord.transferCertificateNumber}.`
                  : "This student has no transfer record yet — transfer them out from Student Management first."}
              </p>
            )}

            {(type === "bonafide" || type === "character" || type === "study" || type === "staff_service") && (
              <div className="space-y-1.5">
                <Label htmlFor="cert-purpose">Purpose (optional)</Label>
                <Input id="cert-purpose" placeholder="e.g. passport application" {...register("purpose")} />
              </div>
            )}

            {type === "study" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cert-fromDate">From</Label>
                  <Input id="cert-fromDate" type="date" {...register("fromDate")} />
                  {errors.fromDate && <p className="text-xs text-red-600">{errors.fromDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cert-toDate">To</Label>
                  <Input id="cert-toDate" type="date" {...register("toDate")} />
                  {errors.toDate && <p className="text-xs text-red-600">{errors.toDate.message}</p>}
                </div>
              </div>
            )}

            {type === "achievement" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cert-event">Event</Label>
                  <Input id="cert-event" placeholder="e.g. Inter-school Science Fair 2026" {...register("event")} />
                  {errors.event && <p className="text-xs text-red-600">{errors.event.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-achievement">Achievement</Label>
                    <Input id="cert-achievement" placeholder="e.g. 1st place" {...register("achievement")} />
                    {errors.achievement && <p className="text-xs text-red-600">{errors.achievement.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-eventDate">Event date</Label>
                    <Input id="cert-eventDate" type="date" {...register("eventDate")} />
                    {errors.eventDate && <p className="text-xs text-red-600">{errors.eventDate.message}</p>}
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={generateMutation.isPending || (type === "transfer" && studentId !== "" && !selectedStudent?.transferRecord)}
            >
              {generateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <FileCheck2 className="w-4 h-4" />
              Generate certificate
            </Button>
          </form>
        </CardContent>
      </Card>

      <CertificateView open={Boolean(issued)} onOpenChange={(v) => !v && setIssued(null)} certificate={issued} />
    </div>
  );
}
