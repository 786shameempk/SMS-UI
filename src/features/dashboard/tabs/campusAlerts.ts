import type { CampusSummary } from "./types";
import { dashboardT, type Translate } from "./i18n";

export interface CampusAlert {
  text: string;
  to: string;
  tone: "danger" | "warning";
}

/** The few things across the campus that need someone today, worst first. Pass the component's `t` so the text follows the interface language. */
export function campusAlerts(d: CampusSummary, t: Translate = dashboardT): CampusAlert[] {
  const out: CampusAlert[] = [];
  const pick = (count: number, one: string, many: string) => t(count === 1 ? one : many, { count });
  if (d.inventory && d.inventory.outOfStock > 0) out.push({ text: pick(d.inventory.outOfStock, "{{count}} inventory item is out of stock", "{{count}} inventory items are out of stock"), to: "/inventory", tone: "danger" });
  if (d.visitors && d.visitors.overstayed > 0) out.push({ text: pick(d.visitors.overstayed, "{{count}} visitor has been inside for over 8 hours", "{{count}} visitors have been inside for over 8 hours"), to: "/visitors", tone: "danger" });
  if (d.transport && d.transport.trackingStale > 0) out.push({ text: pick(d.transport.trackingStale, "{{count}} bus on a trip has not reported a position for 10 minutes", "{{count}} buses on a trip have not reported a position for 10 minutes"), to: "/transport", tone: "danger" });
  if (d.health && d.health.vaccinationsOverdue > 0) out.push({ text: pick(d.health.vaccinationsOverdue, "{{count}} vaccination is overdue", "{{count}} vaccinations are overdue"), to: "/health", tone: "warning" });
  if (d.health && d.health.parentNotNotified > 0) out.push({ text: pick(d.health.parentNotNotified, "{{count}} infirmary visit this week without the parent being told", "{{count}} infirmary visits this week without the parent being told"), to: "/health", tone: "warning" });
  if (d.library && d.library.overdue > 0) out.push({ text: pick(d.library.overdue, "{{count}} library book is overdue", "{{count}} library books are overdue"), to: "/library", tone: "warning" });
  if (d.inventory && d.inventory.lowStock > 0) out.push({ text: pick(d.inventory.lowStock, "{{count}} item is below the reorder level", "{{count}} items are below the reorder level"), to: "/inventory", tone: "warning" });
  return out;
}
