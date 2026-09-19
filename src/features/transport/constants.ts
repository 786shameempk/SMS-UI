import type { BusStatus, BusTrackingStatus, DriverStatus, RouteStatus, TransportAssignmentStatus } from "./types";

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
