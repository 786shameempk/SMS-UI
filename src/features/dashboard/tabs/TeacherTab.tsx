import { Link } from "react-router-dom";
import { CalendarCheck, ClipboardList, FilePenLine, Repeat2 } from "lucide-react";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/utils/format";
import { resolveDateRange } from "../dateRange";
import { getTeacherSummary } from "./api";
import { timeLabel } from "./format";
import { MOCK_TEACHER } from "./mock";
import { BarList, Panel, Row, TabBody, type BarTone, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";

const PASS_TONE = (rate: number): BarTone => (rate >= 90 ? "success" : rate >= 75 ? "warning" : "danger");

export default function TeacherTab({ source, dateRange, rangeLabel }: TabProps) {
  const query = useTabQuery(source, "teacher", dateRange, () => getTeacherSummary(resolveDateRange(dateRange)), () => MOCK_TEACHER);
  return (
    <TabBody query={query}>
      {(d) => {
        if (!d.isTeacher) {
          return (
            <EmptyState
              title="Your login isn't linked to a staff record"
              description="Ask your school administrator to link your login to your staff profile, and your classes and tasks will show up here."
            />
          );
        }
        return (
          <div className="space-y-5">
            <StatGrid columns={4}>
              <StatCard label="Classes today" icon={CalendarCheck} tone="brand" value={d.todayPeriods.length.toLocaleString()} hint={d.todayPeriods.some((p) => p.substitution) ? "Including periods you cover" : "From your timetable"} />
              <StatCard
                label="Attendance to mark"
                icon={ClipboardList}
                tone={d.attendanceToMark.length > 0 ? "warning" : "success"}
                value={d.attendanceToMark.length.toLocaleString()}
                hint={d.attendanceToMark.length > 0 ? d.attendanceToMark.map((s) => s.label).join(", ") : "All your registers are marked"}
              />
              <StatCard
                label="Homework to grade"
                icon={FilePenLine}
                tone={d.submissionsToGrade > 0 ? "info" : "success"}
                value={d.submissionsToGrade.toLocaleString()}
                hint={`${d.homeworkDueSoon} assignment${d.homeworkDueSoon === 1 ? "" : "s"} due in 3 days`}
              />
              <StatCard
                label="Marks to enter"
                icon={Repeat2}
                tone={d.marksToEnter.length > 0 ? "warning" : "success"}
                value={d.marksToEnter.length.toLocaleString()}
                hint="Exams for your subjects with no marks yet"
              />
            </StatGrid>

            <div className="grid gap-4 xl:grid-cols-3">
              <Panel title="Today's timetable" description="Your periods in order" href="/timetable" hrefLabel="Timetable" className="xl:col-span-2">
                {d.todayPeriods.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No classes today.</p>
                ) : (
                  d.todayPeriods.map((p) => (
                    <Row
                      key={`${p.periodNumber}-${p.section}`}
                      title={
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {p.section}
                          {p.subject ? <span className="font-normal text-muted-foreground">· {p.subject}</span> : null}
                          {p.substitution && <Badge variant="warning">Covering</Badge>}
                        </span>
                      }
                      sub={[p.label, p.startTime ? `${timeLabel(p.startTime)} – ${timeLabel(p.endTime)}` : "", p.room ? `Room ${p.room}` : ""].filter(Boolean).join(" · ")}
                    />
                  ))
                )}
              </Panel>

              <Panel title="To do now" description="Quick routes to the work waiting for you">
                <ul className="space-y-2 text-sm">
                  {d.attendanceToMark.map((s) => (
                    <li key={s.sectionId}>
                      <Link to="/attendance" className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span>Mark attendance · {s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.students} students</span>
                      </Link>
                    </li>
                  ))}
                  {d.submissionsToGrade > 0 && (
                    <li>
                      <Link to="/homework" className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span>Grade homework</span>
                        <span className="text-xs text-muted-foreground">{d.submissionsToGrade} submitted</span>
                      </Link>
                    </li>
                  )}
                  {d.marksToEnter.map((m) => (
                    <li key={`${m.examId}-${m.subject}`}>
                      <Link to="/examinations" className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span>Enter marks · {m.subject}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.className} · {m.examName}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {d.attendanceToMark.length === 0 && d.submissionsToGrade === 0 && d.marksToEnter.length === 0 && (
                    <li className="py-4 text-center text-muted-foreground">You&apos;re all caught up.</li>
                  )}
                </ul>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="How your classes are doing" description={`Your subjects only · ${rangeLabel}`} href="/examinations" hrefLabel="Results">
                <BarList
                  max={100}
                  items={d.classPerformance.map((c) => ({
                    key: c.name,
                    label: c.name,
                    value: c.averageScore,
                    display: `${c.averageScore}% avg`,
                    tone: PASS_TONE(c.passRate),
                    sub: `${c.passRate}% pass · ${c.results} result${c.results === 1 ? "" : "s"}`,
                  }))}
                  empty="No results for your subjects in this period."
                />
              </Panel>
              <Panel title="Periods you're covering" description="Upcoming substitutions assigned to you" href="/timetable" hrefLabel="Timetable">
                {d.upcomingSubstitutions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No substitutions assigned to you.</p>
                ) : (
                  d.upcomingSubstitutions.map((s) => (
                    <Row key={`${s.date}-${s.periodNumber}-${s.section}`} title={s.section} sub={`Period ${s.periodNumber}${s.reason ? ` · ${s.reason}` : ""}`} right={formatDate(s.date)} />
                  ))
                )}
              </Panel>
            </div>
          </div>
        );
      }}
    </TabBody>
  );
}
