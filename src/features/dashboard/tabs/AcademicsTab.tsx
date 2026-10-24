import { BookOpenCheck, CalendarX2, ClipboardCheck, Percent, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { resolveDateRange } from "../dateRange";
import { getAcademicsSummary } from "./api";
import { percent } from "./format";
import type { Translate } from "./i18n";
import { MOCK_ACADEMICS } from "./mock";
import { BarList, Note, Panel, Row, TabBody, type BarTone, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";
import type { ScoreGroup } from "./types";

const PASS_TONE = (rate: number): BarTone => (rate >= 90 ? "success" : rate >= 75 ? "warning" : "danger");

function scoreBars(groups: ScoreGroup[], t: Translate) {
  return groups.map((g) => ({
    key: g.name,
    label: g.name,
    value: g.averageScore,
    display: t("{{value}}% avg", { value: g.averageScore }),
    tone: PASS_TONE(g.passRate),
    sub:
      g.results === 1
        ? t("{{rate}}% pass · {{count}} result", { rate: g.passRate, count: g.results.toLocaleString() })
        : t("{{rate}}% pass · {{count}} results", { rate: g.passRate, count: g.results.toLocaleString() }),
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
  const { t } = useTranslation("dashboard");
  const query = useTabQuery(source, "academics", dateRange, () => getAcademicsSummary(resolveDateRange(dateRange)), () => MOCK_ACADEMICS);
  return (
    <TabBody query={query}>
      {(d) => {
        const p = d.pipeline;
        return (
          <div className="space-y-5">
            <StatGrid columns={4}>
              <StatCard
                label={t("Average score")}
                icon={Percent}
                tone="brand"
                value={d.results === 0 ? "—" : `${d.averageScore}%`}
                hint={
                  d.results === 1
                    ? t("{{count}} result · {{range}}", { count: d.results.toLocaleString(), range: rangeLabel })
                    : t("{{count}} results · {{range}}", { count: d.results.toLocaleString(), range: rangeLabel })
                }
              />
              <StatCard label={t("Pass rate")} icon={Trophy} tone={d.results === 0 ? "neutral" : PASS_TONE(d.passRate) === "success" ? "success" : PASS_TONE(d.passRate) === "warning" ? "warning" : "danger"} value={d.results === 0 ? "—" : `${d.passRate}%`} hint={t("Scoring 35% or more")} />
              <StatCard
                label={t("Attendance (30 days)")}
                icon={CalendarX2}
                tone={(d.attendanceLast30DaysPercent ?? 100) >= 90 ? "success" : "warning"}
                value={percent(d.attendanceLast30DaysPercent, 1)}
                hint={
                  d.chronicAbsentees.length === 1
                    ? t("{{count}} student below 75%", { count: d.chronicAbsentees.length })
                    : t("{{count}} students below 75%", { count: d.chronicAbsentees.length })
                }
              />
              <StatCard
                label={t("Results to enter")}
                icon={ClipboardCheck}
                tone={p.completedWithoutResults > 0 ? "warning" : "success"}
                value={p.completedWithoutResults.toLocaleString()}
                hint={t("{{completed}} completed · {{ongoing}} under way · {{scheduled}} scheduled", { completed: p.completed, ongoing: p.ongoing, scheduled: p.scheduled })}
              />
            </StatGrid>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title={t("Results by class")} description={t("Average score; colour shows the pass rate")} href="/examinations" hrefLabel={t("Examinations")}>
                <BarList items={scoreBars(d.byClass, t)} max={100} empty={t("No results entered in this period.")} />
              </Panel>
              <Panel title={t("Results by subject")} description={t("Weakest subjects are worth a conversation")} href="/examinations" hrefLabel={t("Examinations")}>
                <BarList items={scoreBars(d.bySubject, t)} max={100} empty={t("No results entered in this period.")} />
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <Panel title={t("Grade distribution")} description={t("Every result in the period")}>
                <BarList items={d.grades.map((g) => ({ key: g.name, label: g.name, value: g.count, tone: GRADE_TONE(g.name) }))} empty={t("No grades yet.")} />
              </Panel>

              <Panel title={t("Students to celebrate")} description={t("Highest average scores")} href="/students" hrefLabel={t("Students")}>
                {d.topPerformers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t("Appears once results are entered.")}</p>
                ) : (
                  d.topPerformers.map((s) => <Row key={s.studentId} title={s.name} sub={s.classLabel} right={`${s.averageScore}%`} href={`/students/${s.studentId}`} />)
                )}
              </Panel>

              <Panel title={t("Students to support")} description={t("Below the pass mark, or missing school")} href="/students" hrefLabel={t("Students")}>
                {d.needingSupport.length === 0 && d.chronicAbsentees.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t("No student is flagged right now.")}</p>
                ) : (
                  <>
                    {d.needingSupport.map((s) => (
                      <Row key={`s-${s.studentId}`} title={s.name} sub={t("{{classLabel}} · low scores", { classLabel: s.classLabel })} right={t("{{value}}% avg", { value: s.averageScore })} href={`/students/${s.studentId}`} />
                    ))}
                    {d.chronicAbsentees.map((s) => (
                      <Row key={`a-${s.studentId}`} title={s.name} sub={
                          s.daysAbsent === 1
                            ? t("{{classLabel}} · {{count}} day absent", { classLabel: s.classLabel, count: s.daysAbsent })
                            : t("{{classLabel}} · {{count}} days absent", { classLabel: s.classLabel, count: s.daysAbsent })
                        }
                        right={t("{{value}}% attended", { value: s.attendancePercent })} href={`/students/${s.studentId}`} />
                    ))}
                  </>
                )}
              </Panel>
            </div>

            {p.completedWithoutResults > 0 && (
              <Note>
                <BookOpenCheck className="me-1.5 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
                {p.completedWithoutResults === 1
                  ? t("{{count}} completed exam has no marks entered yet. Open Examinations to enter them so results and report cards can be published.", { count: p.completedWithoutResults })
                  : t("{{count}} completed exams have no marks entered yet. Open Examinations to enter them so results and report cards can be published.", { count: p.completedWithoutResults })}
              </Note>
            )}
          </div>
        );
      }}
    </TabBody>
  );
}
