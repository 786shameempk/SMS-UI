import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";

export type BusStatus = "active" | "maintenance" | "inactive";

export interface Bus {
  id: string;
  tenantId: string;
  branchId: string;
  regNumber: string;
  model: string;
  capacity: number;
  manufactureYear: number;
  gpsDeviceId?: string;
  status: BusStatus;
}

export interface BusFormValues {
  regNumber: string;
  model: string;
  capacity: number;
  manufactureYear: number;
  gpsDeviceId?: string;
  status: BusStatus;
}

export type DriverStatus = "active" | "on-leave" | "inactive";

/** License/experience data layered over a staff member whose designation is "Driver". */
export interface DriverProfile {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  experienceYears: number;
  status: DriverStatus;
}

export interface DriverFormValues {
  staffId: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  experienceYears: number;
  status: DriverStatus;
}

export interface Driver extends DriverProfile {
  staff: StaffMember;
}

export type RouteStatus = "active" | "inactive";

export interface TransportRoute {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  busId?: string;
  driverId?: string;
  startTime: string;
  endTime: string;
  status: RouteStatus;
}

export interface TransportRouteFormValues {
  name: string;
  busId?: string;
  driverId?: string;
  startTime: string;
  endTime: string;
  status: RouteStatus;
}

export interface RouteStop {
  id: string;
  tenantId: string;
  branchId: string;
  routeId: string;
  name: string;
  sequence: number;
  arrivalTime: string;
  landmark?: string;
  /** Optional map position; with it, the bus counts as having reached the stop once it comes within the radius. */
  latitude?: number;
  longitude?: number;
  arrivalRadiusMeters: number;
}

export interface RouteStopFormValues {
  name: string;
  arrivalTime: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  arrivalRadiusMeters?: number;
}

/** How far the bus has got with one stop on its current trip. "none" = the stop has no map location. */
export type StopProgress = "none" | "pending" | "reached" | "skipped";

export type TransportAssignmentStatus = "active" | "inactive";

export interface StudentTransportAssignment {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  routeId: string;
  stopId: string;
  monthlyFee?: number;
  assignedOn: string;
  status: TransportAssignmentStatus;
}

export interface StudentTransportAssignmentFormValues {
  studentId: string;
  routeId: string;
  stopId: string;
  monthlyFee?: number;
}

export interface StudentTransportAssignmentRow extends StudentTransportAssignment {
  student: Student;
  route: TransportRoute;
  stop: RouteStop;
}

export type BusTrackingStatus = "idle" | "on-route" | "at-stop" | "completed";

/** Simulated GPS status for a bus currently running an active route. */
export interface BusLiveStatus {
  tenantId: string;
  branchId: string;
  busId: string;
  routeId: string;
  status: BusTrackingStatus;
  currentStopIndex: number;
  speedKmph: number;
  lastUpdated: string;
}

export interface BusLiveStatusRow extends BusLiveStatus {
  bus: Bus;
  route: TransportRoute;
  stops: RouteStop[];
}

/** Where a bus's position comes from. The school picks one in Transport → Tracking setup. */
export type TrackingSource = "mock" | "driver-phone" | "hardware";

export interface TrackingSettings {
  source: TrackingSource;
}

/** One real GPS fix for a bus, from a driver's phone or a hardware tracker. */
export interface BusPosition {
  busId: string;
  latitude: number;
  longitude: number;
  speedKmph: number;
  /** Compass heading in degrees, when the device reports it. */
  heading?: number;
  recordedAt: string;
  source: Exclude<TrackingSource, "mock">;
}

export interface DriverPingValues {
  busId: string;
  latitude: number;
  longitude: number;
  speedKmph: number;
  heading?: number;
  accuracyMeters?: number;
}

export interface ChildStop {
  id: string;
  name: string;
  sequence: number;
  /** "07:35" (scheduled). */
  arrivalTime: string;
  landmark?: string;
  progress: StopProgress;
  /** When the bus reached the stop (ISO, UTC). */
  reachedAt?: string;
}

/** One child's bus, from GET /api/transport/mine (the only transport endpoint a parent login may call). */
export interface ChildBusTracking {
  studentId: string;
  routeId: string;
  routeName: string;
  startTime: string;
  endTime: string;
  /** The child's own stop. */
  stopId: string;
  stops: ChildStop[];
  bus: { id: string; regNumber: string; model: string; capacity: number } | null;
  /** Simulated progress along the stops (Demo source). */
  live: { status: BusTrackingStatus; currentStopIndex: number; speedKmph: number; lastUpdated: string } | null;
  /** What the school uses to place its buses; chosen by the school, not the parent. */
  source: TrackingSource;
  /** Latest real fix; null in Demo mode or before the bus has reported. */
  position: { latitude: number; longitude: number; speedKmph: number; heading?: number; recordedAt: string } | null;
  /** The bus's latest trip (real sources only); null before any trip started. */
  trip: { startedAt: string; endedAt?: string; running: boolean } | null;
}

/** The latest trip of one bus with the stops it has reached or skipped, for the office fleet view. */
export interface BusTripProgress {
  busId: string;
  routeId: string;
  startedAt: string;
  endedAt?: string;
  stops: { stopId: string; status: "reached" | "skipped"; at: string }[];
}

/** A bus the signed-in driver drives (from their driver profile's active routes); never another driver's bus. */
export interface MyDriverBus {
  busId: string;
  regNumber: string;
  model: string;
  routeName: string;
}
