import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type {
  Bus,
  BusFormValues,
  BusLiveStatus,
  BusLiveStatusRow,
  BusStatus,
  BusTrackingStatus,
  Driver,
  DriverFormValues,
  DriverStatus,
  RouteStatus,
  RouteStop,
  RouteStopFormValues,
  StudentTransportAssignment,
  StudentTransportAssignmentFormValues,
  StudentTransportAssignmentRow,
  TransportAssignmentStatus,
  TransportRoute,
  TransportRouteFormValues,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// CampusService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const BUS_STATUS_TO_API: Record<BusStatus, string> = { active: "Active", maintenance: "Maintenance", inactive: "Inactive" };
const BUS_STATUS_FROM_API: Record<string, BusStatus> = { Active: "active", Maintenance: "maintenance", Inactive: "inactive" };

const DRIVER_STATUS_TO_API: Record<DriverStatus, string> = { active: "Active", "on-leave": "OnLeave", inactive: "Inactive" };
const DRIVER_STATUS_FROM_API: Record<string, DriverStatus> = { Active: "active", OnLeave: "on-leave", Inactive: "inactive" };

const ROUTE_STATUS_TO_API: Record<RouteStatus, string> = { active: "Active", inactive: "Inactive" };
const ROUTE_STATUS_FROM_API: Record<string, RouteStatus> = { Active: "active", Inactive: "inactive" };

const ASSIGNMENT_STATUS_TO_API: Record<TransportAssignmentStatus, string> = { active: "Active", inactive: "Inactive" };
const ASSIGNMENT_STATUS_FROM_API: Record<string, TransportAssignmentStatus> = { Active: "active", Inactive: "inactive" };

const TRACKING_STATUS_FROM_API: Record<string, BusTrackingStatus> = {
  Idle: "idle",
  OnRoute: "on-route",
  AtStop: "at-stop",
  Completed: "completed",
};

// ── API response shapes (CampusService DTOs) ────────────────────────────────

interface ApiBus {
  id: string;
  tenantId: string;
  branchId: string;
  regNumber: string;
  model: string;
  capacity: number;
  manufactureYear: number;
  gpsDeviceId: string | null;
  status: string;
}

interface ApiDriverProfile {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  experienceYears: number;
  status: string;
}

interface ApiTransportRoute {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  busId: string | null;
  driverId: string | null;
  startTime: string;
  endTime: string;
  status: string;
}

interface ApiRouteStop {
  id: string;
  tenantId: string;
  branchId: string;
  routeId: string;
  name: string;
  sequence: number;
  arrivalTime: string;
  landmark: string | null;
}

interface ApiStudentTransportAssignment {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  routeId: string;
  stopId: string;
  monthlyFee: number | null;
  assignedOn: string;
  status: string;
}

interface ApiBusLiveStatus {
  id: string;
  tenantId: string;
  branchId: string;
  busId: string;
  routeId: string;
  status: string;
  currentStopIndex: number;
  speedKmph: number;
  lastUpdated: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapBus(dto: ApiBus): Bus {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    regNumber: dto.regNumber,
    model: dto.model,
    capacity: dto.capacity,
    manufactureYear: dto.manufactureYear,
    gpsDeviceId: dto.gpsDeviceId ?? undefined,
    status: BUS_STATUS_FROM_API[dto.status] ?? "active",
  };
}

function mapDriverProfile(dto: ApiDriverProfile) {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    staffId: dto.staffId,
    licenseNumber: dto.licenseNumber,
    licenseExpiryDate: dto.licenseExpiryDate,
    experienceYears: dto.experienceYears,
    status: DRIVER_STATUS_FROM_API[dto.status] ?? "active",
  };
}

function mapRoute(dto: ApiTransportRoute): TransportRoute {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    name: dto.name,
    busId: dto.busId ?? undefined,
    driverId: dto.driverId ?? undefined,
    startTime: dto.startTime,
    endTime: dto.endTime,
    status: ROUTE_STATUS_FROM_API[dto.status] ?? "active",
  };
}

function mapStop(dto: ApiRouteStop): RouteStop {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    routeId: dto.routeId,
    name: dto.name,
    sequence: dto.sequence,
    arrivalTime: dto.arrivalTime,
    landmark: dto.landmark ?? undefined,
  };
}

function mapAssignment(dto: ApiStudentTransportAssignment): StudentTransportAssignment {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    studentId: dto.studentId,
    routeId: dto.routeId,
    stopId: dto.stopId,
    monthlyFee: dto.monthlyFee ?? undefined,
    assignedOn: dto.assignedOn,
    status: ASSIGNMENT_STATUS_FROM_API[dto.status] ?? "active",
  };
}

function mapLiveStatus(dto: ApiBusLiveStatus): BusLiveStatus {
  return {
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    busId: dto.busId,
    routeId: dto.routeId,
    status: TRACKING_STATUS_FROM_API[dto.status] ?? "idle",
    currentStopIndex: dto.currentStopIndex,
    speedKmph: dto.speedKmph,
    lastUpdated: dto.lastUpdated,
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Buses ────────────────────────────────────────────────────────────────

export async function listBuses(): Promise<Bus[]> {
  const buses = await unwrap(campusHttpClient.get<ApiBus[]>("/api/buses"));
  return buses.map(mapBus);
}

export async function createBus(values: BusFormValues): Promise<Bus> {
  const dto = await unwrap(
    campusHttpClient.post<ApiBus>("/api/buses", {
      regNumber: values.regNumber.trim(),
      model: values.model,
      capacity: values.capacity,
      manufactureYear: values.manufactureYear,
      gpsDeviceId: values.gpsDeviceId?.trim() || null,
      status: BUS_STATUS_TO_API[values.status],
    }),
  );
  return mapBus(dto);
}

export async function updateBus(id: string, values: BusFormValues): Promise<Bus> {
  const dto = await unwrap(
    campusHttpClient.put<ApiBus>(`/api/buses/${id}`, {
      regNumber: values.regNumber.trim(),
      model: values.model,
      capacity: values.capacity,
      manufactureYear: values.manufactureYear,
      gpsDeviceId: values.gpsDeviceId?.trim() || null,
      status: BUS_STATUS_TO_API[values.status],
    }),
  );
  return mapBus(dto);
}

export async function deleteBus(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/buses/${id}`));
}

// ── Drivers ──────────────────────────────────────────────────────────────

export async function listDrivers(): Promise<Driver[]> {
  const [profiles, staff] = await Promise.all([
    unwrap(campusHttpClient.get<ApiDriverProfile[]>("/api/driverprofiles")),
    listStaff(),
  ]);
  const staffById = new Map(staff.map((s) => [s.id, s] as const));
  return profiles
    .map(mapDriverProfile)
    .map((p) => {
      const staffMember = staffById.get(p.staffId);
      return staffMember ? { ...p, staff: staffMember } : null;
    })
    .filter((d): d is Driver => d !== null);
}

/** Staff with designation "Driver" who don't already have a transport driver profile. */
export async function listEligibleDriverStaff(): Promise<StaffMember[]> {
  const [profiles, staff] = await Promise.all([
    unwrap(campusHttpClient.get<ApiDriverProfile[]>("/api/driverprofiles")),
    listStaff(),
  ]);
  const profiledStaffIds = new Set(profiles.map((p) => p.staffId));
  return staff.filter((s) => s.designation === "Driver" && !profiledStaffIds.has(s.id));
}

export async function createDriver(values: DriverFormValues): Promise<Driver> {
  const staff = await listStaff();
  const staffMember = staff.find((s) => s.id === values.staffId);
  if (!staffMember) throw new Error("Staff member not found");

  const dto = await unwrap(
    campusHttpClient.post<ApiDriverProfile>("/api/driverprofiles", {
      staffId: values.staffId,
      licenseNumber: values.licenseNumber,
      licenseExpiryDate: values.licenseExpiryDate,
      experienceYears: values.experienceYears,
      status: DRIVER_STATUS_TO_API[values.status],
    }),
  );
  return { ...mapDriverProfile(dto), staff: staffMember };
}

export async function updateDriver(id: string, values: DriverFormValues): Promise<Driver> {
  const dto = await unwrap(
    campusHttpClient.put<ApiDriverProfile>(`/api/driverprofiles/${id}`, {
      licenseNumber: values.licenseNumber,
      licenseExpiryDate: values.licenseExpiryDate,
      experienceYears: values.experienceYears,
      status: DRIVER_STATUS_TO_API[values.status],
    }),
  );
  const staff = await listStaff();
  const staffMember = staff.find((s) => s.id === dto.staffId);
  if (!staffMember) throw new Error("Staff member not found");
  return { ...mapDriverProfile(dto), staff: staffMember };
}

export async function deleteDriver(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/driverprofiles/${id}`));
}

// ── Routes ───────────────────────────────────────────────────────────────

export async function listRoutes(): Promise<TransportRoute[]> {
  const routes = await unwrap(campusHttpClient.get<ApiTransportRoute[]>("/api/transportroutes"));
  return routes.map(mapRoute);
}

export async function createRoute(values: TransportRouteFormValues): Promise<TransportRoute> {
  const dto = await unwrap(
    campusHttpClient.post<ApiTransportRoute>("/api/transportroutes", {
      name: values.name,
      busId: values.busId ?? null,
      driverId: values.driverId ?? null,
      startTime: values.startTime,
      endTime: values.endTime,
      status: ROUTE_STATUS_TO_API[values.status],
    }),
  );
  return mapRoute(dto);
}

export async function updateRoute(id: string, values: TransportRouteFormValues): Promise<TransportRoute> {
  const dto = await unwrap(
    campusHttpClient.put<ApiTransportRoute>(`/api/transportroutes/${id}`, {
      name: values.name,
      busId: values.busId ?? null,
      driverId: values.driverId ?? null,
      startTime: values.startTime,
      endTime: values.endTime,
      status: ROUTE_STATUS_TO_API[values.status],
    }),
  );
  return mapRoute(dto);
}

export async function deleteRoute(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/transportroutes/${id}`));
}

// ── Stops ────────────────────────────────────────────────────────────────

export async function listStops(routeId?: string): Promise<RouteStop[]> {
  const stops = await unwrap(campusHttpClient.get<ApiRouteStop[]>("/api/routestops", { params: routeId ? { routeId } : undefined }));
  return stops.map(mapStop).sort((a, b) => a.sequence - b.sequence);
}

export async function addStop(routeId: string, values: RouteStopFormValues): Promise<RouteStop> {
  const dto = await unwrap(
    campusHttpClient.post<ApiRouteStop>("/api/routestops", {
      routeId,
      name: values.name,
      arrivalTime: values.arrivalTime,
      landmark: values.landmark?.trim() || null,
    }),
  );
  return mapStop(dto);
}

export async function updateStop(id: string, values: RouteStopFormValues): Promise<RouteStop> {
  const dto = await unwrap(
    campusHttpClient.put<ApiRouteStop>(`/api/routestops/${id}`, {
      name: values.name,
      arrivalTime: values.arrivalTime,
      landmark: values.landmark?.trim() || null,
    }),
  );
  return mapStop(dto);
}

export async function deleteStop(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/routestops/${id}`));
}

export async function moveStop(id: string, direction: "up" | "down"): Promise<RouteStop[]> {
  const stops = await unwrap(campusHttpClient.post<ApiRouteStop[]>(`/api/routestops/${id}/move`, { direction }));
  return stops.map(mapStop).sort((a, b) => a.sequence - b.sequence);
}

// ── Student assignments ─────────────────────────────────────────────────

export async function listAssignments(): Promise<StudentTransportAssignmentRow[]> {
  const [assignments, students, routes, stops] = await Promise.all([
    unwrap(campusHttpClient.get<ApiStudentTransportAssignment[]>("/api/studenttransportassignments")),
    listStudents(),
    listRoutes(),
    listStops(),
  ]);
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const routeById = new Map(routes.map((r) => [r.id, r] as const));
  const stopById = new Map(stops.map((s) => [s.id, s] as const));

  return assignments
    .map(mapAssignment)
    .map((a) => {
      const student = studentById.get(a.studentId);
      const route = routeById.get(a.routeId);
      const stop = stopById.get(a.stopId);
      return student && route && stop ? { ...a, student, route, stop } : null;
    })
    .filter((row): row is StudentTransportAssignmentRow => row !== null);
}

export async function createAssignment(values: StudentTransportAssignmentFormValues): Promise<StudentTransportAssignment> {
  const dto = await unwrap(
    campusHttpClient.post<ApiStudentTransportAssignment>("/api/studenttransportassignments", {
      studentId: values.studentId,
      routeId: values.routeId,
      stopId: values.stopId,
      monthlyFee: values.monthlyFee ?? null,
    }),
  );
  return mapAssignment(dto);
}

export async function updateAssignment(id: string, values: StudentTransportAssignmentFormValues): Promise<StudentTransportAssignment> {
  const dto = await unwrap(
    campusHttpClient.put<ApiStudentTransportAssignment>(`/api/studenttransportassignments/${id}`, {
      studentId: values.studentId,
      routeId: values.routeId,
      stopId: values.stopId,
      monthlyFee: values.monthlyFee ?? null,
    }),
  );
  return mapAssignment(dto);
}

export async function setAssignmentStatus(id: string, status: "active" | "inactive"): Promise<StudentTransportAssignment> {
  const dto = await unwrap(
    campusHttpClient.post<ApiStudentTransportAssignment>(`/api/studenttransportassignments/${id}/status`, {
      status: ASSIGNMENT_STATUS_TO_API[status],
    }),
  );
  return mapAssignment(dto);
}

export async function deleteAssignment(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/studenttransportassignments/${id}`));
}

// ── Live tracking (simulated GPS) ───────────────────────────────────────

export async function listLiveStatuses(): Promise<BusLiveStatusRow[]> {
  const [statuses, buses, routes, stops] = await Promise.all([
    unwrap(campusHttpClient.get<ApiBusLiveStatus[]>("/api/buslivestatuses")),
    listBuses(),
    listRoutes(),
    listStops(),
  ]);
  const busById = new Map(buses.map((b) => [b.id, b] as const));
  const routeById = new Map(routes.map((r) => [r.id, r] as const));

  return statuses
    .map(mapLiveStatus)
    .map((status) => {
      const route = routeById.get(status.routeId);
      const bus = busById.get(status.busId);
      if (!route || !bus || route.status !== "active") return null;
      const routeStops = stops.filter((s) => s.routeId === route.id).sort((a, b) => a.sequence - b.sequence);
      return { ...status, bus, route, stops: routeStops };
    })
    .filter((row): row is BusLiveStatusRow => row !== null);
}

export async function simulateGpsPing(busId: string): Promise<BusLiveStatus> {
  const dto = await unwrap(campusHttpClient.post<ApiBusLiveStatus>(`/api/buslivestatuses/${busId}/simulate-ping`));
  return mapLiveStatus(dto);
}

export async function resetLiveStatus(busId: string): Promise<BusLiveStatus> {
  const dto = await unwrap(campusHttpClient.post<ApiBusLiveStatus>(`/api/buslivestatuses/${busId}/reset`));
  return mapLiveStatus(dto);
}
