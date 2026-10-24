import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AlertTriangle, BedDouble, Bus, DoorOpen, HeartPulse, Library, Package } from "lucide-react";
import { Bar as ReBar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/utils/cn";
import { CHART_TICK, CHART_TOOLTIP_STYLE } from "../chartTheme";
import { getCampusSummary } from "./api";
import { compactInr, percent } from "./format";
import { MOCK_CAMPUS } from "./mock";
import { BarList, Facts, Note, Panel, TabBody, type TabProps } from "./ui";
import { useTabQuery } from "./useTabQuery";
import { campusAlerts } from "./campusAlerts";

function Section({ icon: Icon, children }: { icon: typeof Library; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-1 hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function CampusTab({ source }: TabProps) {
  const { t } = useTranslation("dashboard");
  const query = useTabQuery(source, "campus", null, () => getCampusSummary(), () => MOCK_CAMPUS);
  return (
    <TabBody query={query}>
      {(d) => {
        const alerts = campusAlerts(d, t);
        const sections = [d.library, d.transport, d.hostel, d.inventory, d.visitors, d.health].filter(Boolean).length;
        if (sections === 0) return <Note>{t("None of the campus modules is open to your role, so there is nothing to show here.")}</Note>;
        const trend = d.visitors?.last7Days.map((count, i, all) => ({ label: i === all.length - 1 ? t("Today") : t("-{{count}}d", { count: all.length - 1 - i }), count })) ?? [];
        return (
          <div className="space-y-5">
            <Panel title={t("Needs action today")} description={alerts.length ? t("Worst first") : undefined}>
              {alerts.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">{t("Nothing on campus needs attention right now.")}</p>
              ) : (
                <ul className="grid gap-2 md:grid-cols-2">
                  {alerts.map((a) => (
                    <li key={a.text}>
                      <Link
                        to={a.to}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          a.tone === "danger" ? "bg-destructive-soft text-destructive-strong" : "bg-warning-soft text-warning-strong",
                        )}
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {a.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              {d.library && (
                <Panel title={t("Library")} description={t("Books, loans and fines")} href="/library" hrefLabel={t("Library")}>
                  <Section icon={Library}>
                    <Facts
                      items={[
                        { label: t("On loan"), value: d.library.onLoan.toLocaleString() },
                        { label: t("Overdue"), value: d.library.overdue.toLocaleString(), tone: d.library.overdue > 0 ? "danger" : undefined },
                        { label: t("Due today"), value: d.library.dueToday.toLocaleString(), tone: d.library.dueToday > 0 ? "warning" : undefined },
                        { label: t("Returned today"), value: d.library.returnedToday.toLocaleString() },
                        { label: t("Reservations waiting"), value: d.library.pendingReservations.toLocaleString() },
                        { label: t("Fines outstanding"), value: compactInr(d.library.finesOutstanding), tone: d.library.finesOutstanding > 0 ? "warning" : undefined },
                      ]}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t("{{titles}} titles · {{available}} of {{copies}} copies on the shelf · {{members}} members", {
                        titles: d.library.titles.toLocaleString(),
                        available: d.library.availableCopies.toLocaleString(),
                        copies: d.library.copies.toLocaleString(),
                        members: d.library.members.toLocaleString(),
                      })}
                    </p>
                  </Section>
                </Panel>
              )}

              {d.transport && (
                <Panel title={t("Transport")} description={t("Fleet, trips and seats")} href="/transport" hrefLabel={t("Transport")}>
                  <Section icon={Bus}>
                    <Facts
                      items={[
                        { label: t("On a trip now"), value: `${d.transport.onRoute} / ${d.transport.inService}` },
                        { label: t("In maintenance"), value: d.transport.inMaintenance.toLocaleString(), tone: d.transport.inMaintenance > 0 ? "warning" : undefined },
                        { label: t("Signal lost"), value: d.transport.trackingStale.toLocaleString(), tone: d.transport.trackingStale > 0 ? "danger" : undefined },
                        { label: t("Routes"), value: d.transport.routes.toLocaleString() },
                        { label: t("Students riding"), value: d.transport.assignedStudents.toLocaleString() },
                        { label: t("Seats used"), value: percent(d.transport.utilisationPercent) },
                      ]}
                    />
                    <div className="mt-3">
                      <BarList
                        max={Math.max(d.transport.capacity, d.transport.assignedStudents, 1)}
                        items={[{ key: "seats", label: "Seat utilisation", value: d.transport.assignedStudents, display: t("{{used}} of {{capacity}} seats", { used: d.transport.assignedStudents, capacity: d.transport.capacity }), tone: (d.transport.utilisationPercent ?? 0) > 95 ? "danger" : (d.transport.utilisationPercent ?? 0) > 80 ? "warning" : "success" }]}
                      />
                    </div>
                  </Section>
                </Panel>
              )}

              {d.hostel && (
                <Panel title={t("Hostel")} description={t("Beds, today's roll call and visitors")} href="/hostel" hrefLabel={t("Hostel")}>
                  <Section icon={BedDouble}>
                    <Facts
                      items={[
                        { label: t("Beds occupied"), value: `${d.hostel.occupied} / ${d.hostel.beds}` },
                        { label: t("Occupancy"), value: percent(d.hostel.occupancyPercent) },
                        { label: t("Visitors inside"), value: d.hostel.visitorsInside.toLocaleString() },
                        { label: t("Present today"), value: d.hostel.presentToday.toLocaleString(), tone: "success" },
                        { label: t("Absent"), value: d.hostel.absentToday.toLocaleString(), tone: d.hostel.absentToday > 0 ? "danger" : undefined },
                        { label: t("On leave"), value: d.hostel.onLeaveToday.toLocaleString() },
                      ]}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {d.hostel.attendanceMarkedToday === 0
                        ? t("Roll call has not been marked today.")
                        : t("{{marked}} of {{occupied}} residents marked today.", { marked: d.hostel.attendanceMarkedToday, occupied: d.hostel.occupied })}
                    </p>
                    <div className="mt-3">
                      <BarList
                        max={Math.max(...d.hostel.byHostel.map((h) => h.beds), 1)}
                        items={d.hostel.byHostel.map((h) => ({ key: h.name, label: h.name, value: h.occupied, display: `${h.occupied} / ${h.beds}`, tone: h.beds > 0 && h.occupied / h.beds > 0.95 ? "warning" : "brand" }))}
                      />
                    </div>
                  </Section>
                </Panel>
              )}

              {d.inventory && (
                <Panel title={t("Inventory")} description={t("Stock levels")} href="/inventory" hrefLabel={t("Inventory")}>
                  <Section icon={Package}>
                    <Facts
                      items={[
                        { label: t("Items"), value: d.inventory.items.toLocaleString() },
                        { label: t("Below reorder level"), value: d.inventory.lowStock.toLocaleString(), tone: d.inventory.lowStock > 0 ? "warning" : undefined },
                        { label: t("Out of stock"), value: d.inventory.outOfStock.toLocaleString(), tone: d.inventory.outOfStock > 0 ? "danger" : undefined },
                      ]}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">{t("Stock on hand is worth {{amount}}.", { amount: compactInr(d.inventory.stockValue) })}</p>
                    {d.inventory.lowest.length > 0 && (
                      <div className="mt-3">
                        <BarList
                          max={Math.max(...d.inventory.lowest.map((i) => i.reorderLevel), 1)}
                          items={d.inventory.lowest.map((i) => ({ key: i.name, label: i.name, value: i.inStock, display: t("{{inStock}} of {{reorderLevel}}", { inStock: i.inStock, reorderLevel: i.reorderLevel }), tone: i.inStock <= 0 ? "danger" : "warning" }))}
                        />
                      </div>
                    )}
                  </Section>
                </Panel>
              )}

              {d.visitors && (
                <Panel title={t("Visitors")} description={t("Who is on campus")} href="/visitors" hrefLabel={t("Visitors")}>
                  <Section icon={DoorOpen}>
                    <Facts
                      items={[
                        { label: t("Inside now"), value: d.visitors.insideNow.toLocaleString() },
                        { label: t("Today so far"), value: d.visitors.todayTotal.toLocaleString() },
                        { label: t("Still expected"), value: d.visitors.expectedToday.toLocaleString() },
                        { label: t("Over 8 hours"), value: d.visitors.overstayed.toLocaleString(), tone: d.visitors.overstayed > 0 ? "danger" : undefined },
                        { label: t("On watchlist"), value: d.visitors.watchlist.toLocaleString() },
                      ]}
                    />
                    <div className="mt-3 h-24 w-full" aria-label={t("Visitors checked in per day, last 7 days")} role="img">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trend} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                          <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} />
                          <ReBar dataKey="count" name={t("Visitors")} fill="var(--color-brand-500)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Section>
                </Panel>
              )}

              {d.health && (
                <Panel title={t("Health")} description={t("Infirmary and vaccinations")} href="/health" hrefLabel={t("Health")}>
                  <Section icon={HeartPulse}>
                    <Facts
                      items={[
                        { label: t("Infirmary today"), value: d.health.infirmaryToday.toLocaleString() },
                        { label: t("Last 7 days"), value: d.health.infirmaryLast7Days.toLocaleString() },
                        { label: t("Sent home"), value: d.health.sentHomeLast7Days.toLocaleString() },
                        { label: t("Referred to hospital"), value: d.health.referredLast7Days.toLocaleString(), tone: d.health.referredLast7Days > 0 ? "warning" : undefined },
                        { label: t("Vaccinations overdue"), value: d.health.vaccinationsOverdue.toLocaleString(), tone: d.health.vaccinationsOverdue > 0 ? "danger" : undefined },
                        { label: t("Due in 30 days"), value: d.health.vaccinationsDueSoon.toLocaleString() },
                      ]}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t("{{count}} checkups in the last 90 days.", { count: d.health.checkupsLast90Days.toLocaleString() })}{" "}
                      {d.health.parentNotNotified > 0
                        ? t("{{count}} infirmary visit(s) this week had no parent notification.", { count: d.health.parentNotNotified })
                        : t("Parents were told about every infirmary visit this week.")}
                    </p>
                  </Section>
                </Panel>
              )}
            </div>
            {sections < 6 && <Note>{t("Only the modules open to your role are shown.")}</Note>}
          </div>
        );
      }}
    </TabBody>
  );
}
