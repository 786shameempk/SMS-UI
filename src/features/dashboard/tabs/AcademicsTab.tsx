import { BookOpenCheck, CalendarX2, ClipboardCheck, Percent, Trophy } from "lucide-react";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { resolveDateRange } from "../dateRange";
import { getAcademicsSummary } from "./api";
import { percent } from "./format";
import { MOCK_ACADEMICS } from "./mock";
import { BarList, Note, Panel, Row, TabBody, type BarTone, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";
import type { ScoreGroup } from "./types";

const PASS_TONE = (rate: number): BarTone => (rate >= 90 ? "success" : rate >= 75 ? "warning" : "danger");

function scoreBars(groups: ScoreGroup[]) {
  return groups.map((g) => ({
    key: g.name,
    label: g.name,
    value: g.averageScore,
    display: `${g.averageScore}% avg`,
    tone: PASS_TONE(g.passRate),
    sub: `${g.passRate}% pass · ${g.results.toLocaleString()} result${g.results === 1 ? "" : "s"}`,
  }));
}

const GRADE_TONE = (grade: string): BarTone => {
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "success";
  if (g.startsWith("B")) return "info";
  if (g.startsWith("C")) return "brand";
  if (g.startsWith("D")) return "warning";
  return "danger";
};

export default function AcademicsTab({ source, dateRange, rangeLabel }: TabProps) {
  const query = useTabQuery(source, "academics", dateRange, () => getAcademicsSummary(resolveDateRange(dateRange)), () => MOCK_ACADEMICS);
  return (
    <TabBody query={query}>
      {(d) => {
        const p = d.pipeline;
        return (
          <div className="space-y-5">
            <StatGrid columns={4}>
              <StatCard label="Average score" icon={Percent} tone="brand" value={d.results === 0 ? "—" : `${d.averageScore}%`} hint={`${d.results.toLocaleString()} result${d.results === 1 ? "" : "s"} · ${rangeLabel}`} />
              <StatCard label="Pass rate" icon={Trophy} tone={d.results === 0 ? "neutral" : PASS_TONE(d.passRate) === "success" ? "success" : PASS_TONE(d.passRate) === "warning" ? "warning" : "danger"} value={d.results === 0 ? "—" : `${d.passRate}%`} hint="Scoring 35% or more" />
              <StatCard
                label="Attendance (30 days)"
                icon={CalendarX2}
                tone={(d.attendanceLast30DaysPercent ?? 100) >= 90 ? "success" : "warning"}
                value={percent(d.attendanceLast30DaysPercent, 1)}
                hint={`${d.chronicAbsentees.length} student${d.chronicAbsentees.length === 1 ? "" : "s"} below 75%`}
              />
              <StatCard
                label="Results to enter"
                icon={ClipboardCheck}
                tone={p.completedWithoutResults > 0 ? "warning" : "success"}
                value={p.completedWithoutResults.toLocaleString()}
                hint={`${p.completed} completed · ${p.ongoing} under way · ${p.scheduled} scheduled`}
              />
            </StatGrid>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Results by class" description="Average score; colour shows the pass rate" href="/examinations" hrefLabel="Examinations">
                <BarList items={scoreBars(d.byClass)} max={100} empty="No results entered in this period." />
              </Panel>
              <Panel title="Results by subject" description="Weakest subjects are worth a conversation" href="/examinations" hrefLabel="Examinations">
                <BarList items={scoreBars(d.bySubject)} max={100} empty="No results entered in this period." />
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <Panel title="Grade distribution" description="Every result in the period">
                <BarList items={d.grades.map((g) => ({ key: g.name, label: g.name, value: g.count, tone: GRADE_TONE(g.name) }))} empty="No grades yet." />
              </Panel>

              <Panel title="Students to celebrate" description="Highest average scores" href="/students" hrefLabel="Students">
                {d.topPerformers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Appears once results are entered.</p>
                ) : (
                  d.topPerformers.map((s) => <Row key={s.studentId} title={s.name} sub={s.classLabel} right={`${s.averageScore}%`} href={`/students/${s.studentId}`} />)
                )}
              </Panel>

              <Panel title="Students to support" description="Below the pass mark, or missing school" href="/students" hrefLabel="Students">
                {d.needingSupport.length === 0 && d.chronicAbsentees.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No student is flagged right now.</p>
                ) : (
                  <>
                    {d.needingSupport.map((s) => (
                      <Row key={`s-${s.studentId}`} title={s.name} sub={`${s.classLabel} · low scores`} right={`${s.averageScore}% avg`} href={`/students/${s.studentId}`} />
                    ))}
                    {d.chronicAbsentees.map((s) => (
                      <Row key={`a-${s.studentId}`} title={s.name} sub={`${s.classLabel} · ${s.daysAbsent} day${s.daysAbsent === 1 ? "" : "s"} absent`} right={`${s.attendancePercent}% attended`} href={`/students/${s.studentId}`} />
                    ))}
                  </>
                )}
              </Panel>
            </div>

            {p.completedWithoutResults > 0 && (
              <Note>
                <BookOpenCheck className="mr-1.5 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
                {p.completedWithoutResults} completed exam{p.completedWithoutResults === 1 ? " has" : "s have"} no marks entered yet. Open Examinations to enter them so results and report cards can be published.
              </Note>
            )}
          </div>
        );
      }}
    </TabBody>
  );
}
