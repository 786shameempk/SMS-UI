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
}

export interface RouteStopFormValues {
  name: string;
  arrivalTime: string;
  landmark?: string;
}

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
