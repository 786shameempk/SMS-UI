import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ShieldCheck } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { getNotificationPreferences, getPortionSettings, listAudit, saveNotificationPreferences, savePortionSettings } from "../api";
import { ALERT_LABEL, COMPLETION_MODE_LABEL, SelectField, formatDateTime, options, useApiMutation, usePortionAccess } from "../shared";
import type { AuditEntry, CompletionMode, PortionSettings } from "../types";

export default function SettingsPage() {
  const access = usePortionAccess();
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ModuleSettings canManage={access.canManage} />
        <div className="space-y-6">
          <AlertPreferences />
          <Permissions access={access} />
        </div>
      </div>
      {access.canReport && <AuditTrail />}
    </div>
  );
}

const TOGGLES: Array<{ key: keyof PortionSettings; label: string; hint: string }> = [
  { key: "requirePlanApproval", label: "Lesson plans need approval", hint: "Teachers submit plans and a coordinator approves them. Off: a submitted plan is published straight away." },
  { key: "familyViewEnabled", label: "Parents and students can see syllabus progress", hint: "A read-only view of published syllabus coverage. Teacher notes, observations, delay reasons and internal remarks are never shown." },
  { key: "showHomeworkToFamilies", label: "Show homework with the topics", hint: "The homework a teacher records against a topic." },
  { key: "showExamSyllabusToFamilies", label: "Show published examination syllabus", hint: "The chapters and topics an exam covers, once published." },
];

const ALERTS: Array<{ key: keyof PortionSettings; label: string }> = [
  { key: "notifyDeadlines", label: "Upcoming chapter and term-end deadlines" },
  { key: "notifyOverduePlans", label: "Overdue lesson plans" },
  { key: "notifyMissingUpdates", label: "Missing daily teaching updates" },
  { key: "notifyBehindTarget", label: "Syllabus falling behind target" },
  { key: "notifyRevisions", label: "Revised lesson plans" },
  { key: "notifyApprovals", label: "Pending approvals and decisions" },
];

function ModuleSettings({ canManage }: { canManage: boolean }) {
  const query = useQuery({ queryKey: ["portions", "settings"], queryFn: getPortionSettings });
  const [v, setV] = useState<PortionSettings | null>(null);
  const [numbers, setNumbers] = useState({ threshold: "10", missing: "3", reminder: "7" });
  useEffect(() => {
    if (query.data) {
      setV(query.data);
      setNumbers({ threshold: String(query.data.behindThresholdPercent), missing: String(query.data.missingUpdateAfterDays), reminder: String(query.data.deadlineReminderDays) });
    }
  }, [query.data]);
  const save = useApiMutation(savePortionSettings, { success: "Settings saved", invalidate: [["portions"]] });

  const check = (value: string, min: number, max: number) => (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max ? undefined : `Enter a whole number from ${min} to ${max}`);
  const errors = { threshold: check(numbers.threshold, 1, 50), missing: check(numbers.missing, 1, 30), reminder: check(numbers.reminder, 1, 60) };
  const invalid = Boolean(errors.threshold || errors.missing || errors.reminder);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module settings</CardTitle>
        <CardDescription>How lesson plans, progress and alerts behave for this branch. {canManage ? "" : "Only people who manage the syllabus can change them."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading && <Skeleton className="h-48 w-full" />}
        {query.isError && <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />}
        {v && (
          <>
            {TOGGLES.map((t) => (
              <label key={t.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  {t.label}
                  <span className="block text-xs text-muted-foreground">{t.hint}</span>
                </span>
                <Switch checked={Boolean(v[t.key])} disabled={!canManage} onCheckedChange={(c) => setV({ ...v, [t.key]: c })} aria-label={t.label} />
              </label>
            ))}
            <FormField label="How completion is measured" htmlFor="st-mode" hint="Used for every percentage in the module. Only completed topics count.">
              <SelectField id="st-mode" value={v.completionMode} onChange={(m) => setV({ ...v, completionMode: (m ?? "Periods") as CompletionMode })} items={options(COMPLETION_MODE_LABEL)} disabled={!canManage} className="w-full sm:w-72" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Behind when trailing by" htmlFor="st-threshold" error={errors.threshold} hint="Percentage points.">
                <Input id="st-threshold" inputMode="numeric" value={numbers.threshold} disabled={!canManage} onChange={(e) => setNumbers({ ...numbers, threshold: e.target.value })} aria-invalid={errors.threshold ? true : undefined} />
              </FormField>
              <FormField label="Missing update after" htmlFor="st-missing" error={errors.missing} hint="Days with nothing recorded.">
                <Input id="st-missing" inputMode="numeric" value={numbers.missing} disabled={!canManage} onChange={(e) => setNumbers({ ...numbers, missing: e.target.value })} aria-invalid={errors.missing ? true : undefined} />
              </FormField>
              <FormField label="Deadline reminder" htmlFor="st-reminder" error={errors.reminder} hint="Days before a deadline.">
                <Input id="st-reminder" inputMode="numeric" value={numbers.reminder} disabled={!canManage} onChange={(e) => setNumbers({ ...numbers, reminder: e.target.value })} aria-invalid={errors.reminder ? true : undefined} />
              </FormField>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Alerts the school sends</legend>
              {ALERTS.map((a) => (
                <label key={a.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  {a.label}
                  <Switch checked={Boolean(v[a.key])} disabled={!canManage} onCheckedChange={(c) => setV({ ...v, [a.key]: c })} aria-label={a.label} />
                </label>
              ))}
            </fieldset>
            {canManage && (
              <div className="flex justify-end">
                <Button
                  loading={save.isPending}
                  disabled={invalid}
                  onClick={() => save.mutate({ ...v, behindThresholdPercent: Number(numbers.threshold), missingUpdateAfterDays: Number(numbers.missing), deadlineReminderDays: Number(numbers.reminder) })}
                >
                  Save settings
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AlertPreferences() {
  const query = useQuery({ queryKey: ["portions", "preferences"], queryFn: getNotificationPreferences });
  const save = useApiMutation(saveNotificationPreferences, { success: "Preferences saved", invalidate: [["portions", "preferences"]] });
  const muted = new Set(query.data?.mutedTypes ?? []);
  const toggle = (type: string, on: boolean) => {
    const next = new Set(muted);
    if (on) next.delete(type);
    else next.add(type);
    save.mutate([...next]);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>My alerts</CardTitle>
        <CardDescription>Choose which of these alerts reach you. You only ever get alerts about classes and plans you are responsible for. Turned off for everyone? Then your choice doesn't matter.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isLoading && <Skeleton className="h-32 w-full" />}
        {query.isError && <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />}
        {query.data?.availableTypes.map((type) => (
          <label key={type} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            {ALERT_LABEL[type] ?? type}
            <Switch checked={!muted.has(type)} disabled={save.isPending} onCheckedChange={(on) => toggle(type, on)} aria-label={ALERT_LABEL[type] ?? type} />
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

const ACTIONS: Array<{ key: string; label: string; hint: string; has: (a: ReturnType<typeof usePortionAccess>) => boolean }> = [
  { key: "Portions.Manage", label: "Set up syllabus and settings", hint: "Curricula, syllabus plans, chapters and topics, imports, exam portions, these settings.", has: (a) => a.canManage },
  { key: "Portions.Plan", label: "Create lesson plans", hint: "Plan and revise lesson plans for classes and subjects they teach.", has: (a) => a.canPlan },
  { key: "Portions.Progress", label: "Record teaching progress", hint: "Mark topics started, completed or delayed for their own classes.", has: (a) => a.canProgress },
  { key: "Portions.Approve", label: "Approve plans and correct progress", hint: "Approve or reject plans, reschedule lessons, correct a recorded state with a reason.", has: (a) => a.canApprove },
  { key: "Portions.Reports", label: "See school-wide reports", hint: "All classes and teachers, forecasts and the audit trail.", has: (a) => a.canReport },
];

function Permissions({ access }: { access: ReturnType<typeof usePortionAccess> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> What you can do here
        </CardTitle>
        <CardDescription>
          Set by your school in{" "}
          <Link to="/admin/roles" className="text-primary hover:underline">
            Roles & Permissions
          </Link>{" "}
          (Syllabus & Portions). Teachers only ever see their own classes and subjects, whatever the settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {ACTIONS.map((a) => (
            <li key={a.key} className="flex items-start justify-between gap-3 py-2 text-sm">
              <span>
                {a.label}
                <span className="block text-xs text-muted-foreground">{a.hint}</span>
              </span>
              <Badge variant={a.has(access) ? "success" : "neutral"}>{a.has(access) ? "Yes" : "No"}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AuditTrail() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState<string | undefined>();
  const query = useQuery({ queryKey: ["portions", "audit", entity, page], queryFn: () => listAudit({ entityType: entity, page, pageSize: 25 }), placeholderData: (p) => p });
  const columns: ColumnDef<AuditEntry, unknown>[] = [
    { id: "at", header: "When", accessorFn: (r) => r.at, cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.at)}</span> },
    { id: "entity", header: "What", accessorFn: (r) => r.entityType, cell: ({ row }) => <span className="text-sm">{row.original.entityType}</span> },
    { id: "action", header: "Action", accessorFn: (r) => r.action, cell: ({ row }) => <Badge variant="neutral">{row.original.action.replace(/-/g, " ")}</Badge> },
    { id: "details", header: "Details", accessorFn: (r) => r.details ?? "", cell: ({ row }) => <span className="line-clamp-2 max-w-md break-all font-mono text-xs text-muted-foreground">{row.original.details ?? "—"}</span> },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit trail</CardTitle>
        <CardDescription>Syllabus changes, lesson plan assignments and decisions, progress updates and corrections, deadline changes, exam portion publication and settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => query.refetch()}
          exportFileName="portion-audit-trail"
          pageSize={25}
          serverPagination={{ pageIndex: page - 1, pageSize: 25, totalCount: query.data?.totalCount ?? 0, onPageChange: (i) => setPage(i + 1) }}
          filters={<SelectField aria-label="What" value={entity} onChange={(v) => { setEntity(v); setPage(1); }} allLabel="Everything" items={["SyllabusPlan", "SyllabusChapter", "SyllabusTopic", "LessonPlan", "LessonProgress", "Exam", "PortionSettings", "Curriculum", "LessonResource"].map((e) => ({ value: e, label: e }))} className="w-48" />}
          empty={{ title: "Nothing recorded yet" }}
        />
      </CardContent>
    </Card>
  );
}
