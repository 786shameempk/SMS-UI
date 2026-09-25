import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays, CalendarPlus, ClipboardCheck, Film, History, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils/cn";
import { listMeetings, listTodayMeetings, listUpcomingMeetings } from "../api";
import { TYPE_LEGEND } from "../constants";
import { meetingKeys, useMeetingRole, useNow } from "../hooks";
import type { MeetingSummary, MeetingType } from "../types";
import { GroupedMeetingList, MeetingList } from "../components/MeetingList";
import NextUpCard from "../components/NextUpCard";
import ScheduleMeetingDialog from "../components/ScheduleMeetingDialog";
import PushReminderBanner from "../components/PushReminderBanner";

type Tab = "today" | "upcoming" | "past" | "drafts";

function EmptyList({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
    </div>
  );
}

/** What's happening now or next: a live one first, else the soonest that hasn't ended. */
function pickNext(today: MeetingSummary[], upcoming: MeetingSummary[], now: number): MeetingSummary | undefined {
  const open = [...today, ...upcoming].filter((m) => (m.status === "Live" || m.status === "Scheduled") && Date.parse(m.endUtc) > now);
  const mine = open.filter((m) => m.myRelation !== "Manager" && m.myRelation !== "ChildViewer");
  const pool = mine.length ? mine : open;
  return pool.find((m) => m.status === "Live") ?? pool.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc))[0];
}

export default function MeetingsHomePage() {
  const { canSchedule, canSeeReports, isParent, user } = useMeetingRole();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) ?? "today";
  // Filters by colour group ("Staff & management" covers four meeting types), so it's applied client-side.
  const group = TYPE_LEGEND.find((g) => g.label === params.get("type"));
  const matches = (m: MeetingSummary) => !group || group.types.includes(m.meetingType);
  const [search, setSearch] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<MeetingType>("OnlineClass");
  const now = useNow(30_000);

  const today = useQuery({ queryKey: meetingKeys.today, queryFn: listTodayMeetings, refetchInterval: 30_000 });
  const upcoming = useQuery({ queryKey: meetingKeys.upcoming, queryFn: () => listUpcomingMeetings(21, 60), refetchInterval: 60_000 });
  const past = useQuery({
    queryKey: meetingKeys.list({ tab: "past", search }),
    queryFn: () => listMeetings({ to: new Date().toISOString(), descending: true, pageSize: 100, search: search || undefined }),
    enabled: tab === "past",
  });
  const drafts = useQuery({
    queryKey: meetingKeys.list({ tab: "drafts" }),
    queryFn: () => listMeetings({ status: "Draft", mine: true, pageSize: 50 }),
    enabled: tab === "drafts" && canSchedule,
  });

  const next = useMemo(() => pickNext(today.data ?? [], upcoming.data ?? [], now), [today.data, upcoming.data, now]);
  const laterToday = (today.data ?? []).filter((m) => m.id !== next?.id);
  const upcomingLater = useMemo(() => {
    const todayIds = new Set((today.data ?? []).map((m) => m.id));
    return (upcoming.data ?? []).filter((m) => !todayIds.has(m.id) && m.id !== next?.id);
  }, [upcoming.data, today.data, next]);
  const pastItems = (past.data?.items ?? []).filter((m) => m.status !== "Draft" && Date.parse(m.startUtc) < now);

  const setTab = (value: string) => setParams((p) => { p.set("tab", value); return p; }, { replace: true });
  const setType = (label?: string) => setParams((p) => { if (label) p.set("type", label); else p.delete("type"); return p; }, { replace: true });
  const openSchedule = (type: MeetingType) => { setScheduleType(type); setScheduleOpen(true); };

  const firstName = user?.name?.split(" ")[0];
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {firstName ? `Hi ${firstName}` : "Online Classes"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {today.data ? `${today.data.filter((m) => m.status !== "Cancelled").length} ${isParent ? "classes and meetings" : "sessions"} today` : "Your classes and meetings"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/online-classes/calendar"><CalendarDays className="h-4 w-4" /> Calendar</Link></Button>
          {canSchedule && <Button onClick={() => openSchedule("OnlineClass")}><Plus className="h-4 w-4" /> Schedule class</Button>}
        </div>
      </header>

      {today.isLoading || upcoming.isLoading ? <Skeleton className="h-32 w-full rounded-2xl" /> : <NextUpCard meeting={next} />}

      <PushReminderBanner />

      {canSchedule && (
        <nav aria-label="Quick actions" className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2">
          {[
            { label: "Schedule class", icon: Plus, onClick: () => openSchedule("OnlineClass") },
            { label: "Schedule meeting", icon: Users, onClick: () => openSchedule("ParentTeacherMeeting") },
            { label: "Calendar", icon: CalendarDays, to: "/online-classes/calendar" },
            { label: "Attendance", icon: ClipboardCheck, to: "/online-classes/reports?tab=attendance" },
            { label: "Recordings", icon: Film, onClick: () => setTab("past") },
            ...(canSeeReports ? [{ label: "Reports", icon: BarChart3, to: "/online-classes/reports" }] : []),
          ].map((a) => {
            const content = (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <a.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="truncate">{a.label}</span>
              </>
            );
            const cls = "flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
            return "to" in a && a.to ? (
              <Link key={a.label} to={a.to} className={cls}>{content}</Link>
            ) : (
              <button key={a.label} type="button" onClick={a.onClick} className={cn(cls, "text-left")}>{content}</button>
            );
          })}
        </nav>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past"><History className="mr-1 h-3.5 w-3.5" />Past</TabsTrigger>
            {canSchedule && <TabsTrigger value="drafts">Drafts</TabsTrigger>}
          </TabsList>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
            <button type="button" onClick={() => setType(undefined)} aria-pressed={!group}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium cursor-pointer", !group ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-secondary")}>
              All
            </button>
            {TYPE_LEGEND.map((g) => {
              const on = group?.label === g.label;
              return (
                <button key={g.label} type="button" onClick={() => setType(on ? undefined : g.label)} aria-pressed={on}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer", on ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-secondary")}>
                  <span className={cn("h-2 w-2 rounded-full", g.dot)} aria-hidden />
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        <TabsContent value="today" className="mt-4">
          {today.isLoading ? <ListSkeleton /> : (
            <MeetingList
              meetings={laterToday.filter(matches)}
              empty={<EmptyList>{next ? "Nothing else today." : "Nothing scheduled today."}</EmptyList>}
            />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.isLoading ? <ListSkeleton /> : (
            <GroupedMeetingList
              meetings={upcomingLater.filter(matches)}
              empty={
                <EmptyList>
                  Nothing in the next three weeks.
                  {canSchedule && (
                    <Button size="sm" variant="link" onClick={() => openSchedule("OnlineClass")}>
                      <CalendarPlus className="h-4 w-4" /> Schedule one
                    </Button>
                  )}
                </EmptyList>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="past-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, class or teacher" className="pl-9" />
          </div>
          {past.isLoading ? <ListSkeleton /> : (
            <MeetingList meetings={pastItems.filter(matches)} showDate empty={<EmptyList>No past classes or meetings yet.</EmptyList>} />
          )}
        </TabsContent>

        {canSchedule && (
          <TabsContent value="drafts" className="mt-4">
            {drafts.isLoading ? <ListSkeleton /> : (
              <MeetingList meetings={drafts.data?.items ?? []} showDate empty={<EmptyList>No drafts. Use “Save as draft” when scheduling to finish later.</EmptyList>} />
            )}
          </TabsContent>
        )}
      </Tabs>

      {canSchedule && <ScheduleMeetingDialog open={scheduleOpen} onOpenChange={setScheduleOpen} initialType={scheduleType} />}
    </div>
  );
}
