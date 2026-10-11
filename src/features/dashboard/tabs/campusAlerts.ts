import type { CampusSummary } from "./types";

export interface CampusAlert {
  text: string;
  to: string;
  tone: "danger" | "warning";
}

/** The few things across the campus that need someone today, worst first. */
export function campusAlerts(d: CampusSummary): CampusAlert[] {
  const out: CampusAlert[] = [];
  if (d.inventory && d.inventory.outOfStock > 0) out.push({ text: `${d.inventory.outOfStock} inventory item${d.inventory.outOfStock === 1 ? " is" : "s are"} out of stock`, to: "/inventory", tone: "danger" });
  if (d.visitors && d.visitors.overstayed > 0) out.push({ text: `${d.visitors.overstayed} visitor${d.visitors.overstayed === 1 ? " has" : "s have"} been inside for over 8 hours`, to: "/visitors", tone: "danger" });
  if (d.transport && d.transport.trackingStale > 0) out.push({ text: `${d.transport.trackingStale} bus${d.transport.trackingStale === 1 ? "" : "es"} on a trip ha${d.transport.trackingStale === 1 ? "s" : "ve"} not reported a position for 10 minutes`, to: "/transport", tone: "danger" });
  if (d.health && d.health.vaccinationsOverdue > 0) out.push({ text: `${d.health.vaccinationsOverdue} vaccination${d.health.vaccinationsOverdue === 1 ? " is" : "s are"} overdue`, to: "/health", tone: "warning" });
  if (d.health && d.health.parentNotNotified > 0) out.push({ text: `${d.health.parentNotNotified} infirmary visit${d.health.parentNotNotified === 1 ? "" : "s"} this week without the parent being told`, to: "/health", tone: "warning" });
  if (d.library && d.library.overdue > 0) out.push({ text: `${d.library.overdue} library book${d.library.overdue === 1 ? " is" : "s are"} overdue`, to: "/library", tone: "warning" });
  if (d.inventory && d.inventory.lowStock > 0) out.push({ text: `${d.inventory.lowStock} item${d.inventory.lowStock === 1 ? " is" : "s are"} below the reorder level`, to: "/inventory", tone: "warning" });
  return out;
}
