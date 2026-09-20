import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, RAISED_BY_TYPE_OPTIONS } from "../constants";
import { raiseTicket } from "../api";
import type { RaisedByType, TicketCategory, TicketPriority } from "../types";

const raiseTicketSchema = z
  .object({
    category: z.enum(CATEGORY_OPTIONS.map((o) => o.value) as [TicketCategory, ...TicketCategory[]]),
    priority: z.enum(PRIORITY_OPTIONS.map((o) => o.value) as [TicketPriority, ...TicketPriority[]]),
    subject: z.string().min(1, "Subject is required"),
    description: z.string().min(1, "Description is required"),
    raisedByType: z.enum(["student", "parent", "staff", "anonymous"] as [RaisedByType, ...RaisedByType[]]),
    raisedByStudentId: z.string().optional(),
    raisedByStaffId: z.string().optional(),
    raisedByName: z.string().optional(),
    raisedByContact: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.raisedByType === "student" && !values.raisedByStudentId) ctx.addIssue({ code: "custom", path: ["raisedByStudentId"], message: "Select a student" });
    if (values.raisedByType === "staff" && !values.raisedByStaffId) ctx.addIssue({ code: "custom", path: ["raisedByStaffId"], message: "Select a staff member" });
    if (values.raisedByType === "parent" && !values.raisedByName?.trim()) ctx.addIssue({ code: "custom", path: ["raisedByName"], message: "Parent/guardian name is required" });
  });

type FormValues = z.infer<typeof raiseTicketSchema>;

const emptyValues: FormValues = {
  category: "academic",
  priority: "medium",
  subject: "",
  description: "",
  raisedByType: "student",
  raisedByStudentId: "",
  raisedByStaffId: "",
  raisedByName: "",
  raisedByContact: "",
};

export default function RaiseTicketTab() {
  const queryClient = useQueryClient();
  const [lastTicketNumber, setLastTicketNumber] = useState<string | null>(null);
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(raiseTicketSchema), defaultValues: emptyValues });

  const raisedByType = watch("raisedByType");

  const mutation = useMutation({
    mutationFn: raiseTicket,
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk"] });
      toast.success(`Ticket ${ticket.ticketNumber} raised`);
      setLastTicketNumber(ticket.ticketNumber);
      reset(emptyValues);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not raise ticket"),
  });

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Raise a ticket</CardTitle>
          <CardDescription>Log a complaint or support request and route it to the right person.</CardDescription>
        </CardHeader>
        <CardContent>
          {lastTicketNumber && (
            <p className="text-xs rounded-md border border-green-200 bg-green-50 text-green-700 px-2.5 py-2 mb-4">
              Ticket <strong>{lastTicketNumber}</strong> was raised successfully.
            </p>
          )}
          <form
            onSubmit={handleSubmit((values) =>
              mutation.mutate({
                ...values,
                raisedByStudentId: values.raisedByType === "student" ? values.raisedByStudentId : undefined,
                raisedByStaffId: values.raisedByType === "staff" ? values.raisedByStaffId : undefined,
                raisedByName: values.raisedByType === "parent" ? values.raisedByName?.trim() : undefined,
                raisedByContact: values.raisedByType === "parent" ? values.raisedByContact?.trim() || undefined : undefined,
              }),
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hd-category">Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="hd-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hd-priority">Priority</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="hd-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hd-subject">Subject</Label>
              <Input id="hd-subject" placeholder="Short summary of the issue" {...register("subject")} />
              {errors.subject && <p className="text-xs text-red-600">{errors.subject.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hd-description">Description</Label>
              <Textarea id="hd-description" rows={4} placeholder="What happened, and any relevant details" {...register("description")} />
              {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hd-raisedByType">Raised by</Label>
              <Controller
                control={control}
                name="raisedByType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hd-raisedByType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RAISED_BY_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {raisedByType === "student" && (
              <div className="space-y-1.5">
                <Label htmlFor="hd-studentId">Student</Label>
                <Controller
                  control={control}
                  name="raisedByStudentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="hd-studentId">
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} · {s.className} - {s.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.raisedByStudentId && <p className="text-xs text-red-600">{errors.raisedByStudentId.message}</p>}
              </div>
            )}

            {raisedByType === "staff" && (
              <div className="space-y-1.5">
                <Label htmlFor="hd-staffId">Staff member</Label>
                <Controller
                  control={control}
                  name="raisedByStaffId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="hd-staffId">
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} · {s.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.raisedByStaffId && <p className="text-xs text-red-600">{errors.raisedByStaffId.message}</p>}
              </div>
            )}

            {raisedByType === "parent" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hd-parentName">Parent/guardian name</Label>
                  <Input id="hd-parentName" {...register("raisedByName")} />
                  {errors.raisedByName && <p className="text-xs text-red-600">{errors.raisedByName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hd-parentContact">Contact (optional)</Label>
                  <Input id="hd-parentContact" placeholder="Phone or email" {...register("raisedByContact")} />
                </div>
              </div>
            )}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <LifeBuoy className="w-4 h-4" />
              Raise ticket
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
