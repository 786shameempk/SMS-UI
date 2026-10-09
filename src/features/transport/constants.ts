import type { BusStatus, BusTrackingStatus, DriverStatus, RouteStatus, TrackingSource, TransportAssignmentStatus } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const BUS_STATUS_CONFIG: Record<BusStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  maintenance: { label: "Maintenance", variant: "warning" },
  inactive: { label: "Inactive", variant: "neutral" },
};

export const DRIVER_STATUS_CONFIG: Record<DriverStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  "on-leave": { label: "On leave", variant: "warning" },
  inactive: { label: "Inactive", variant: "neutral" },
};

export const ROUTE_STATUS_CONFIG: Record<RouteStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
};

export const ASSIGNMENT_STATUS_CONFIG: Record<TransportAssignmentStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
};

export const TRACKING_STATUS_CONFIG: Record<BusTrackingStatus, { label: string; variant: BadgeVariant }> = {
  idle: { label: "Idle", variant: "neutral" },
  "on-route": { label: "On route", variant: "info" },
  "at-stop": { label: "At stop", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
};


export const TRACKING_SOURCE_CONFIG: Record<TrackingSource, { label: string; short: string; description: string }> = {
  mock: {
    label: "Demo (simulated)",
    short: "Demo",
    description: "No real GPS. Buses move along their route when staff press “Simulate GPS ping”. Use it for demos and training.",
  },
  "driver-phone": {
    label: "Driver's phone",
    short: "Driver phone",
    description: "The driver opens SchoolSphere on their phone, picks the bus and taps Start trip. The phone sends its location while the trip runs.",
  },
  hardware: {
    label: "Hardware GPS tracker per bus",
    short: "GPS tracker",
    description: "A GPS device fitted in each bus sends its location on its own. Enter the device ID against each bus.",
  },
};

export const TRACKING_SOURCE_OPTIONS = (Object.keys(TRACKING_SOURCE_CONFIG) as TrackingSource[]).map((value) => ({
  value,
  label: TRACKING_SOURCE_CONFIG[value].label,
}));

/** A real position older than this is shown as "last seen", not "live". */
export const POSITION_STALE_AFTER_MS = 2 * 60 * 1000;
/** How often the parent screen and the driver phone refresh / report. */
export const TRACKING_POLL_MS = 10_000;
