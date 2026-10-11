import type { ReactNode } from "react";
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
  const query = useTabQuery(source, "campus", null, () => getCampusSummary(), () => MOCK_CAMPUS);
  return (
    <TabBody query={query}>
      {(d) => {
        const alerts = campusAlerts(d);
        const sections = [d.library, d.transport, d.hostel, d.inventory, d.visitors, d.health].filter(Boolean).length;
        if (sections === 0) return <Note>None of the campus modules is open to your role, so there is nothing to show here.</Note>;
        const trend = d.visitors?.last7Days.map((count, i, all) => ({ label: i === all.length - 1 ? "Today" : `-${all.length - 1 - i}d`, count })) ?? [];
        return (
          <div className="space-y-5">
            <Panel title="Needs action today" description={alerts.length ? "Worst first" : undefined}>
              {alerts.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">Nothing on campus needs attention right now.</p>
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
                <Panel title="Library" description="Books, loans and fines" href="/library" hrefLabel="Library">
                  <Section icon={Library}>
                    <Facts
                      items={[
                        { label: "On loan", value: d.library.onLoan.toLocaleString() },
                        { label: "Overdue", value: d.library.overdue.toLocaleString(), tone: d.library.overdue > 0 ? "danger" : undefined },
                        { label: "Due today", value: d.library.dueToday.toLocaleString(), tone: d.library.dueToday > 0 ? "warning" : undefined },
                        { label: "Returned today", value: d.library.returnedToday.toLocaleString() },
                        { label: "Reservations waiting", value: d.library.pendingReservations.toLocaleString() },
                        { label: "Fines outstanding", value: compactInr(d.library.finesOutstanding), tone: d.library.finesOutstanding > 0 ? "warning" : undefined },
                      ]}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {d.library.titles.toLocaleString()} titles · {d.library.availableCopies.toLocaleString()} of {d.library.copies.toLocaleString()} copies on the shelf · {d.library.members.toLocaleString()} members
                    </p>
                  </Section>
                </Panel>
              )}

              {d.transport && (
                <Panel title="Transport" description="Fleet, trips and seats" href="/transport" hrefLabel="Transport">
                  <Section icon={Bus}>
                    <Facts
                      items={[
                        { label: "On a trip now", value: `${d.transport.onRoute} / ${d.transport.inService}` },
                        { label: "In maintenance", value: d.transport.inMaintenance.toLocaleString(), tone: d.transport.inMaintenance > 0 ? "warning" : undefined },
                        { label: "Signal lost", value: d.transport.trackingStale.toLocaleString(), tone: d.transport.trackingStale > 0 ? "danger" : undefined },
                        { label: "Routes", value: d.transport.routes.toLocaleString() },
                        { label: "Students riding", value: d.transport.assignedStudents.toLocaleString() },
                        { label: "Seats used", value: percent(d.transport.utilisationPercent) },
                      ]}
                    />
                    <div className="mt-3">
                      <BarList
                        max={Math.max(d.transport.capacity, d.transport.assignedStudents, 1)}
                        items={[{ key: "seats", label: "Seat utilisation", value: d.transport.assignedStudents, display: `${d.transport.assignedStudents} of ${d.transport.capacity} seats`, tone: (d.transport.utilisationPercent ?? 0) > 95 ? "danger" : (d.transport.utilisationPercent ?? 0) > 80 ? "warning" : "success" }]}
                      />
                    </div>
                  </Section>
                </Panel>
              )}

              {d.hostel && (
                <Panel title="Hostel" description="Beds, today's roll call and visitors" href="/hostel" hrefLabel="Hostel">
                  <Section icon={BedDouble}>
                    <Facts
                      items={[
                        { label: "Beds occupied", value: `${d.hostel.occupied} / ${d.hostel.beds}` },
                        { label: "Occupancy", value: percent(d.hostel.occupancyPercent) },
                        { label: "Visitors inside", value: d.hostel.visitorsInside.toLocaleString() },
                        { label: "Present today", value: d.hostel.presentToday.toLocaleString(), tone: "success" },
                        { label: "Absent", value: d.hostel.absentToday.toLocaleString(), tone: d.hostel.absentToday > 0 ? "danger" : undefined },
                        { label: "On leave", value: d.hostel.onLeaveToday.toLocaleString() },
                      ]}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {d.hostel.attendanceMarkedToday === 0 ? "Roll call has not been marked today." : `${d.hostel.attendanceMarkedToday} of ${d.hostel.occupied} residents marked today.`}
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
                <Panel title="Inventory" description="Stock levels" href="/inventory" hrefLabel="Inventory">
                  <Section icon={Package}>
                    <Facts
                      items={[
                        { label: "Items", value: d.inventory.items.toLocaleString() },
                        { label: "Below reorder level", value: d.inventory.lowStock.toLocaleString(), tone: d.inventory.lowStock > 0 ? "warning" : undefined },
                        { label: "Out of stock", value: d.inventory.outOfStock.toLocaleString(), tone: d.inventory.outOfStock > 0 ? "danger" : undefined },
                      ]}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">Stock on hand is worth {compactInr(d.inventory.stockValue)}.</p>
                    {d.inventory.lowest.length > 0 && (
                      <div className="mt-3">
                        <BarList
                          max={Math.max(...d.inventory.lowest.map((i) => i.reorderLevel), 1)}
                          items={d.inventory.lowest.map((i) => ({ key: i.name, label: i.name, value: i.inStock, display: `${i.inStock} of ${i.reorderLevel}`, tone: i.inStock <= 0 ? "danger" : "warning" }))}
                        />
                      </div>
                    )}
                  </Section>
                </Panel>
              )}

              {d.visitors && (
                <Panel title="Visitors" description="Who is on campus" href="/visitors" hrefLabel="Visitors">
                  <Section icon={DoorOpen}>
                    <Facts
                      items={[
                        { label: "Inside now", value: d.visitors.insideNow.toLocaleString() },
                        { label: "Today so far", value: d.visitors.todayTotal.toLocaleString() },
                        { label: "Still expected", value: d.visitors.expectedToday.toLocaleString() },
                        { label: "Over 8 hours", value: d.visitors.overstayed.toLocaleString(), tone: d.visitors.overstayed > 0 ? "danger" : undefined },
                        { label: "On watchlist", value: d.visitors.watchlist.toLocaleString() },
                      ]}
                    />
                    <div className="mt-3 h-24 w-full" aria-label="Visitors checked in per day, last 7 days" role="img">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trend} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                          <Tooltip cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} contentStyle={CHART_TOOLTIP_STYLE} />
                          <ReBar dataKey="count" name="Visitors" fill="var(--color-brand-500)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Section>
                </Panel>
              )}

              {d.health && (
                <Panel title="Health" description="Infirmary and vaccinations" href="/health" hrefLabel="Health">
                  <Section icon={HeartPulse}>
                    <Facts
                      items={[
                        { label: "Infirmary today", value: d.health.infirmaryToday.toLocaleString() },
                        { label: "Last 7 days", value: d.health.infirmaryLast7Days.toLocaleString() },
                        { label: "Sent home", value: d.health.sentHomeLast7Days.toLocaleString() },
                        { label: "Referred to hospital", value: d.health.referredLast7Days.toLocaleString(), tone: d.health.referredLast7Days > 0 ? "warning" : undefined },
                        { label: "Vaccinations overdue", value: d.health.vaccinationsOverdue.toLocaleString(), tone: d.health.vaccinationsOverdue > 0 ? "danger" : undefined },
                        { label: "Due in 30 days", value: d.health.vaccinationsDueSoon.toLocaleString() },
                      ]}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {d.health.checkupsLast90Days.toLocaleString()} checkups in the last 90 days. {d.health.parentNotNotified > 0 ? `${d.health.parentNotNotified} infirmary visit(s) this week had no parent notification.` : "Parents were told about every infirmary visit this week."}
                    </p>
                  </Section>
                </Panel>
              )}
            </div>
            {sections < 6 && <Note>Only the modules open to your role are shown.</Note>}
          </div>
        );
      }}
    </TabBody>
  );
}
