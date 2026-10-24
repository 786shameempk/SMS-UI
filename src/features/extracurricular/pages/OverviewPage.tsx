import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, ClipboardCheck, Leaf, Medal, Trophy, UserX, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard, getMyOverview, listNonParticipants } from "../api";
import { ENROLLMENT_STATUS_LABEL, GROUP_KIND_LABEL, TEAM_ROLE_LABEL } from "../constants";
import { ColorDot, SelectField, formatDate, formatTime, useAcademicYears, useExtracurricularAccess } from "../shared";

import { useTranslation } from "react-i18next";
export default function OverviewPage() {
  const access = useExtracurricularAccess();
  return access.isFamily ? <FamilyOverview /> : <StaffOverview />;
}

function StaffOverview() {
  const { t } = useTranslation("extracurricular");
  const years = useAcademicYears();
  const [year, setYear] = useState<string | undefined>(undefined);
  const academicYear = year ?? years.current;
  const dashboard = useQuery({ queryKey: ["extracurricular", "dashboard", academicYear], queryFn: () => getDashboard(academicYear) });
  const idle = useQuery({ queryKey: ["extracurricular", "non-participants", academicYear], queryFn: () => listNonParticipants(academicYear) });

  if (dashboard.isError) return <ErrorState onRetry={() => dashboard.refetch()} retrying={dashboard.isFetching} />;
  const d = dashboard.data;
  const max = Math.max(1, ...(d?.byCategory.map((c) => c.participants) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">{t("Academic year")}</span>
        <div className="w-40">
          <SelectField value={academicYear} onChange={(v) => setYear(v)} items={years.names.map((n) => ({ value: n, label: n }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("Activities")} value={d?.activities ?? "—"} hint={d ? t("{{activeActivities}} active, {{activitiesWithSpace}} with space", { activeActivities: d.activeActivities, activitiesWithSpace: d.activitiesWithSpace }) : undefined} icon={Trophy} loading={dashboard.isLoading} />
        <StatCard
          label={t("Students taking part")}
          value={d ? `${d.participatingStudents}` : "—"}
          hint={d ? t("{{participationRate}}% of {{students}} students", { participationRate: d.participationRate, students: d.students }) : undefined}
          icon={Users}
          tone="success"
          loading={dashboard.isLoading}
        />
        <StatCard label={t("Houses & teams")} value={d ? `${d.groups} / ${d.teams}` : "—"} hint={t("groups / teams")} icon={Medal} tone="info" loading={dashboard.isLoading} />
        <StatCard
          label={t("Waiting for a decision")}
          value={d ? d.pendingEnrollments + d.pendingAchievements : "—"}
          hint={d ? t("{{pendingEnrollments}} requests, {{pendingAchievements}} achievements", { pendingEnrollments: d.pendingEnrollments, pendingAchievements: d.pendingAchievements }) : undefined}
          icon={ClipboardCheck}
          tone={d && d.pendingEnrollments + d.pendingAchievements > 0 ? "warning" : "neutral"}
          loading={dashboard.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Participation by category")}</CardTitle>
            <CardDescription>{t("Approved students per category this year.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.isLoading && <Skeleton className="h-24 w-full" />}
            {d && d.byCategory.length === 0 && <EmptyState size="sm" bare title={t("No activities yet")} description={t("Create one under Activities.")} />}
            {d?.byCategory.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <ColorDot color={c.color} />
                    <span className="truncate">{c.category}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {c.participants} {c.participants === 1 ? t("student") : t("students")} · {c.activities} {c.activities === 1 ? t("activity") : t("activities")}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary" role="img" aria-label={t("{{category}}: {{participants}} students", { category: c.category, participants: c.participants })}>
                  <div className="h-full rounded-full" style={{ width: `${(100 * c.participants) / max}%`, backgroundColor: c.color }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" /> {t("Coming up")}
            </CardTitle>
            <CardDescription>
              {d ? t("{{upcomingSessions}} sessions and {{upcomingEvents}} events ahead.", { upcomingSessions: d.upcomingSessions, upcomingEvents: d.upcomingEvents }) : t("Next sessions and events.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {d && d.nextSessions.length + d.nextEvents.length === 0 && <EmptyState size="sm" bare title={t("Nothing scheduled")} description={t("Add sessions under Schedule or an event under Events.")} />}
            {d?.nextSessions.map((s) => (
              <Link key={s.id} to="/extracurricular/schedule" className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary/60">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.activityName}{s.venue ? ` · ${s.venue}` : ""}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(s.date)} · {formatTime(s.startTime)}</span>
              </Link>
            ))}
            {d?.nextEvents.map((e) => (
              <Link key={e.id} to="/extracurricular/events" className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary/60">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.eventType}{e.venue ? ` · ${e.venue}` : ""}</span>
                </span>
                <Badge variant="brand">{formatDate(e.startDate)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Most popular activities")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d && d.topActivities.length === 0 && <EmptyState size="sm" bare title={t("No enrollments yet")} />}
            {d?.topActivities.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{a.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {a.enrolled}
                  {a.capacity ? ` / ${a.capacity}` : ""} {a.waitlisted > 0 && <Badge variant="warning">{t("{{waitlisted}} waiting", { waitlisted: a.waitlisted })}</Badge>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-success-strong" /> {t("Green campus progress")}
            </CardTitle>
            <CardDescription>{t("Verified, measured figures against each target.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d && d.campaigns.length === 0 && <EmptyState size="sm" bare title={t("No active campaigns")} description={t("Start one under Sustainability.")} />}
            {d?.campaigns.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {c.verifiedTotal} / {c.target} {c.unit}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={c.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={t("{{name}} progress", { name: c.name })}>
                  <div className="h-full rounded-full bg-success" style={{ width: `${c.progressPercent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-muted-foreground" /> {t("Students not in any activity")}
          </CardTitle>
          <CardDescription>{idle.data ? t("{{length}} students have not been approved for an activity this year.", { length: idle.data.length }) : t("Checking…")}</CardDescription>
        </CardHeader>
        <CardContent>
          {idle.data && idle.data.length === 0 && <p className="text-sm text-muted-foreground">{t("Everyone is taking part in something.")}</p>}
          <ul className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {idle.data?.slice(0, 60).map((s) => (
              <li key={s.id}>
                <Badge variant="neutral">
                  {s.name}
                  {s.className ? ` · ${s.className}` : ""}
                </Badge>
              </li>
            ))}
            {idle.data && idle.data.length > 60 && <li className="text-xs text-muted-foreground">{t("and {{v1}} more", { v1: idle.data.length - 60 })}</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function FamilyOverview() {
  const { t: tr } = useTranslation("extracurricular");
  const overview = useQuery({ queryKey: ["extracurricular", "me"], queryFn: getMyOverview });
  if (overview.isError) return <ErrorState onRetry={() => overview.refetch()} retrying={overview.isFetching} />;
  const o = overview.data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{tr("Activities")}</CardTitle>
          <CardDescription>{tr("Places, requests and the waiting list.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {overview.isLoading && <Skeleton className="h-16 w-full" />}
          {o && o.enrollments.length === 0 && (
            <EmptyState
              size="sm"
              bare
              title={tr("No activities yet")}
              description={tr("Browse the catalog and ask to join one.")}
              action={
                <Link className="text-sm font-medium text-primary hover:underline" to="/extracurricular/activities">
                  {tr("Browse activities")}
                </Link>
              }
            />
          )}
          {o?.enrollments.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{e.activityName}</span>
                <span className="block truncate text-xs text-muted-foreground">{e.studentName}</span>
              </span>
              <StatusBadge status={e.status} label={ENROLLMENT_STATUS_LABEL[e.status]} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Houses and groups")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {o && o.groups.length === 0 && <p className="text-sm text-muted-foreground">{tr("Not placed in a house or group yet.")}</p>}
          {o?.groups.map((g) => (
            <div key={`${g.studentId}-${g.kind}-${g.academicYear}-${g.groupName}`} className="flex items-center gap-2 text-sm">
              <ColorDot color={g.color} />
              <span className="font-medium">{g.groupName}</span>
              <span className="text-muted-foreground">
                {GROUP_KIND_LABEL[g.kind]} · {g.studentName} · {g.academicYear}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Teams")}</CardTitle>
          <CardDescription>{o ? tr("{{achievements}} published {{v1}}", { achievements: o.achievements, v1: o.achievements === 1 ? "achievement" : "achievements" }) : undefined}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {o && o.teams.length === 0 && <p className="text-sm text-muted-foreground">{tr("Not in a team yet.")}</p>}
          {o?.teams.map((t) => (
            <div key={`${t.studentId}-${t.activityName}-${t.teamName}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium">{t.teamName}</span> <span className="text-muted-foreground">({t.activityName}) · {t.studentName}</span>
              </span>
              <Badge variant={t.role === "Member" ? "neutral" : "brand"}>{t.isSubstitute ? tr("Substitute") : TEAM_ROLE_LABEL[t.role]}{t.jerseyNumber != null ? ` #${t.jerseyNumber}` : ""}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
