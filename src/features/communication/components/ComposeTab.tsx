import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { composeMessage, listGroups, listTemplates } from "../api";
import type { ComposeMessageFormValues } from "../types";
import ChannelSelector from "./ChannelSelector";
import MultiSelectList from "./MultiSelectList";

const NONE = "__none__";
const channelEnum = z.enum(["email", "sms", "push", "whatsapp", "in-app"]);

const composeSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1, "Message body is required"),
  channels: z.array(channelEnum).min(1, "Select at least one channel"),
  groupIds: z.array(z.string()),
  studentIds: z.array(z.string()),
  staffIds: z.array(z.string()),
  scheduledAt: z.string().optional(),
});

type FormValues = z.infer<typeof composeSchema>;

const emptyValues: FormValues = { subject: "", body: "", channels: ["email"], groupIds: [], studentIds: [], staffIds: [], scheduledAt: "" };

export default function ComposeTab() {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState(NONE);

  const { data: groups = [] } = useQuery({ queryKey: ["communication", "groups"], queryFn: listGroups });
  const { data: templates = [] } = useQuery({ queryKey: ["communication", "templates"], queryFn: listTemplates });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(composeSchema), defaultValues: emptyValues });

  const groupIds = watch("groupIds");
  const studentIds = watch("studentIds");
  const staffIds = watch("staffIds");
  const scheduledAt = watch("scheduledAt");

  const recipientCount = useMemo(() => {
    const studentSet = new Set(studentIds);
    const staffSet = new Set(staffIds);
    const parentSet = new Set<string>();
    groupIds.forEach((id) => {
      const group = groups.find((g) => g.id === id);
      if (!group) return;
      if (group.audienceType === "students") group.memberIds.forEach((m) => studentSet.add(m));
      else if (group.audienceType === "staff") group.memberIds.forEach((m) => staffSet.add(m));
      else group.memberIds.forEach((m) => parentSet.add(m));
    });
    return studentSet.size + staffSet.size + parentSet.size;
  }, [groupIds, studentIds, staffIds, groups]);

  const groupOptions = useMemo(() => groups.map((g) => ({ id: g.id, label: g.name, sublabel: `${g.memberIds.length} members` })), [groups]);
  const studentOptions = useMemo(
    () => students.map((s) => ({ id: s.id, label: `${s.firstName} ${s.lastName}`, sublabel: `${s.className}-${s.section}` })),
    [students],
  );
  const staffOptions = useMemo(() => staff.map((s) => ({ id: s.id, label: `${s.firstName} ${s.lastName}`, sublabel: s.designation })), [staff]);

  const composeMutation = useMutation({
    mutationFn: composeMessage,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["communication", "messages"] });
      if (message.channels.includes("in-app")) queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(message.status === "scheduled" ? "Message scheduled" : "Message sent");
      reset(emptyValues);
      setTemplateId(NONE);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send message"),
  });

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === NONE) return;
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setValue("subject", template.subject ?? "");
    setValue("body", template.body);
    setValue("channels", template.channels);
  };

  return (
    <form
      onSubmit={handleSubmit((values: FormValues) => {
        const payload: ComposeMessageFormValues = {
          subject: values.subject?.trim() || undefined,
          body: values.body,
          channels: values.channels,
          groupIds: values.groupIds,
          studentIds: values.studentIds,
          staffIds: values.staffIds,
          scheduledAt: values.scheduledAt || undefined,
        };
        composeMutation.mutate(payload);
      })}
      className="grid grid-cols-1 lg:grid-cols-2 gap-5"
    >
      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cmp-template">Start from a template (optional)</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger id="cmp-template">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cmp-subject">Subject (optional, used for email)</Label>
            <Input id="cmp-subject" placeholder="e.g. Fee payment reminder" {...register("subject")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cmp-body">Message</Label>
            <Textarea id="cmp-body" rows={6} placeholder="Write your message…" {...register("body")} />
            {errors.body && <p className="text-xs text-red-600">{errors.body.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Channels</Label>
            <Controller control={control} name="channels" render={({ field }) => <ChannelSelector value={field.value} onChange={field.onChange} />} />
            {errors.channels && <p className="text-xs text-red-600">{errors.channels.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cmp-scheduledAt" className="flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Schedule for later (optional)
            </Label>
            <Input id="cmp-scheduledAt" type="datetime-local" {...register("scheduledAt")} />
            <p className="text-xs text-muted-foreground">Leave blank to send immediately.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            control={control}
            name="groupIds"
            render={({ field }) => (
              <MultiSelectList
                label="Groups"
                options={groupOptions}
                selected={field.value}
                onChange={field.onChange}
                searchPlaceholder="Search groups…"
                emptyMessage="No groups yet — create one in the Groups tab."
              />
            )}
          />
          <Controller
            control={control}
            name="studentIds"
            render={({ field }) => (
              <MultiSelectList label="Individual students" options={studentOptions} selected={field.value} onChange={field.onChange} searchPlaceholder="Search students…" />
            )}
          />
          <Controller
            control={control}
            name="staffIds"
            render={({ field }) => (
              <MultiSelectList label="Individual staff" options={staffOptions} selected={field.value} onChange={field.onChange} searchPlaceholder="Search staff…" />
            )}
          />

          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-slate-700">
            <span className="font-semibold">{recipientCount}</span> recipient{recipientCount === 1 ? "" : "s"} will receive this message.
          </div>

          <Button type="submit" className="w-full" disabled={composeMutation.isPending}>
            {composeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {scheduledAt ? "Schedule message" : "Send now"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
