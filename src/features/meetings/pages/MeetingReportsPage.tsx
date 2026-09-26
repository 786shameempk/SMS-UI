import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import {
  downloadReport, getMeetingReport, getMeetingSettings, getStudentAttendanceReport, getTeacherReport, listSectionOptions,
  type ReportFilters, updateMeetingSettings,
} from "../api";
import { MEETING_TYPES, REMINDER_OPTIONS } from "../constants";
import { useMeetingRole } from "../hooks";
import type { MeetingSettings } from "../types";
import { formatDuration, isoDate } from "../utils";
import { StatCard } from "@/components/ui/stat-card";

const ALL = "__all__";

/** SVG fill attributes can't read CSS variables, so the brand colour is resolved from the live theme. */
function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <StatCard label={label} value={value} hint={hint} />;
}

function PercentBar({ value }: { value: number }) {
  const tone = value >= 85 ? "bg-success" : value >= 70 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="tabular-nums">{value}%</span>
    </div>
  );
}

function ExportButtons({ kind, filters }: { kind: "attendance" | "teachers"; filters: ReportFilters }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (format: "csv" | "xlsx") => {
    setBusy(format);
    try {
      await downloadReport(kind, format, filters);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button size="sm" variant="outline" onClick={() => run("xlsx")} disabled={!!busy}>
        {busy === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("csv")} disabled={!!busy}>
        {busy === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} CSV
      </Button>
      <Button size="sm" variant="outline" onClick={() => window.print()} title="Opens the print dialog - choose “Save as PDF”">
        <Printer className="h-4 w-4" /> PDF
      </Button>
    </div>
  );
}

export default function MeetingReportsPage() {
  const { isAdmin, isManager } = useMeetingRole();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [sectionId, setSectionId] = useState(ALL);

  const filters: ReportFilters = {
    from: new Date(`${from}T00:00`).toISOString(),
    to: new Date(`${to}T23:59:59`).toISOString(),
    sectionId: sectionId === ALL ? undefined : sectionId,
  };

  const { data: sections = [] } = useQuery({ queryKey: ["meetings", "sections"], queryFn: listSectionOptions, staleTime: 300_000 });
  const summary = useQuery({ queryKey: ["meetings", "report", "summary", filters], queryFn: () => getMeetingReport(filters), enabled: tab === "overview" });
  const students = useQuery({ queryKey: ["meetings", "report", "students", filters], queryFn: () => getStudentAttendanceReport(filters), enabled: tab === "attendance" });
  const teachers = useQuery({ queryKey: ["meetings", "report", "teachers", filters], queryFn: () => getTeacherReport(filters), enabled: tab === "teachers" });

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <Link to="/online-classes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground print:hidden">
          <ArrowLeft className="h-4 w-4" /> Online Classes
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Online class reports</h1>
        <p className="text-sm text-muted-foreground">{isManager ? "Every class and meeting in your school." : "The classes you host."}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="space-y-1">
          <Label htmlFor="report-from" className="text-xs">From</Label>
          <Input id="report-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-to" className="text-xs">To</Label>
          <Input id="report-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-class" className="text-xs">Class</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger id="report-class" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classes</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams((p) => { p.set("tab", v); return p; }, { replace: true })}>
        <TabsList className="print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Student attendance</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {summary.isLoading || !summary.data ? <Skeleton className="h-48 w-full rounded-xl" /> : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Total" value={summary.data.total} hint={`${summary.data.upcoming} still to come`} />
                <Stat label="Held" value={summary.data.completed} hint={formatDuration(summary.data.totalMinutesHeld) + " of teaching"} />
                <Stat label="Cancelled" value={summary.data.cancelled} />
                <Stat label="Average attendance" value={`${summary.data.averageAttendancePercent}%`} hint="Present or late" />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Sessions per day</h2>
                {summary.data.byDay.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No sessions held in this period.</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.data.byDay.map((d) => ({ ...d, label: new Date(d.date).toLocaleDateString(undefined, { day: "numeric", month: "short" }) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke={cssVar("--color-border", "#e2e8f0")} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: cssVar("--color-muted-foreground", "#64748b") }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: cssVar("--color-muted-foreground", "#64748b") }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="completed" name="Held" stackId="a" fill={cssVar("--color-primary", "#ECA427")} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              {summary.data.byType.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {summary.data.byType.map((t) => (
                    <span key={t.type} className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", MEETING_TYPES[t.type].chip)}>
                      {MEETING_TYPES[t.type].label} <strong className="tabular-nums">{t.count}</strong>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Lowest attendance first. Partial counts as half.</p>
            <ExportButtons kind="attendance" filters={filters} />
          </div>
          {students.isLoading ? <Skeleton className="h-48 w-full rounded-xl" /> : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {["Student", "Classes", "Present", "Late", "Partial", "Absent", "Attendance"].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border tabular-nums">
                  {(students.data ?? []).length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No finished classes in this period.</td></tr>}
                  {(students.data ?? []).map((r) => (
                    <tr key={r.userId}>
                      <td className="px-4 py-2.5"><span className="block font-medium text-foreground">{r.name}</span><span className="text-xs text-muted-foreground">{r.detail}</span></td>
                      <td className="px-4 py-2.5">{r.totalClasses}</td>
                      <td className="px-4 py-2.5">{r.present}</td>
                      <td className="px-4 py-2.5">{r.late}</td>
                      <td className="px-4 py-2.5">{r.partial}</td>
                      <td className="px-4 py-2.5">{r.absent}</td>
                      <td className="px-4 py-2.5"><PercentBar value={r.attendancePercent} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="teachers" className="mt-4 space-y-3">
          <div className="flex justify-end"><ExportButtons kind="teachers" filters={filters} /></div>
          {teachers.isLoading ? <Skeleton className="h-48 w-full rounded-xl" /> : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {["Teacher", "Classes held", "Cancelled", "Students reached", "Avg. attendance", "Time taught"].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border tabular-nums">
                  {(teachers.data ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No classes in this period.</td></tr>}
                  {(teachers.data ?? []).map((r) => (
                    <tr key={r.hostUserId}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{r.teacher}</td>
                      <td className="px-4 py-2.5">{r.classesConducted}</td>
                      <td className="px-4 py-2.5">{r.classesCancelled}</td>
                      <td className="px-4 py-2.5">{r.totalStudents}</td>
                      <td className="px-4 py-2.5"><PercentBar value={r.averageAttendancePercent} /></td>
                      <td className="px-4 py-2.5">{formatDuration(r.minutesTaught)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings" className="mt-4">
            <SettingsForm />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function SettingsForm() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["meetings", "settings"], queryFn: getMeetingSettings });
  const [form, setForm] = useState<MeetingSettings | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  const save = useMutation({
    mutationFn: (s: MeetingSettings) => updateMeetingSettings(s),
    onSuccess: (s) => {
      queryClient.setQueryData(["meetings", "settings"], s);
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!form) return <Skeleton className="h-64 w-full rounded-xl" />;

  const toggleReminder = (value: number) =>
    setForm({ ...form, defaultReminderOffsetsMinutes: form.defaultReminderOffsetsMinutes.includes(value) ? form.defaultReminderOffsetsMinutes.filter((v) => v !== value) : [...form.defaultReminderOffsetsMinutes, value] });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="settings-late">Late after (minutes)</Label>
          <Input id="settings-late" type="number" min={0} max={60} value={form.lateAfterMinutes} onChange={(e) => setForm({ ...form, lateAfterMinutes: Number(e.target.value) })} />
          <p className="text-xs text-muted-foreground">Joining later than this counts as Late.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-present">Present if they stay at least (%)</Label>
          <Input id="settings-present" type="number" min={1} max={100} value={form.presentMinPercent} onChange={(e) => setForm({ ...form, presentMinPercent: Number(e.target.value) })} />
          <p className="text-xs text-muted-foreground">Less than this counts as Partial.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-retention">Keep recordings for (days)</Label>
          <Input id="settings-retention" type="number" min={7} max={3650} value={form.recordingRetentionDays} onChange={(e) => setForm({ ...form, recordingRetentionDays: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-tz">School time zone</Label>
          <Input id="settings-tz" value={form.timeZoneId} onChange={(e) => setForm({ ...form, timeZoneId: e.target.value })} placeholder="Asia/Kolkata" />
          <p className="text-xs text-muted-foreground">Used to word notifications, e.g. “at 10:00 AM”.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Default reminders</Label>
        <div className="flex flex-wrap gap-2">
          {REMINDER_OPTIONS.map((r) => {
            const on = form.defaultReminderOffsetsMinutes.includes(r.value);
            return (
              <button key={r.value} type="button" aria-pressed={on} onClick={() => toggleReminder(r.value)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium cursor-pointer", on ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-secondary")}>
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Students can use chat in classes</span>
        <Switch id="settings-student-chat" checked={form.studentsCanChat} onCheckedChange={(v) => setForm({ ...form, studentsCanChat: v })} />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Parents can watch recordings shared with them</span>
        <Switch id="settings-parent-recordings" checked={form.parentsCanViewRecordings} onCheckedChange={(v) => setForm({ ...form, parentsCanViewRecordings: v })} />
      </label>
      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending}>Save settings</Button>
      </div>
    </form>
  );
}
