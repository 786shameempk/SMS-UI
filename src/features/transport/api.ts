import { mockDelay } from "@/utils/mockDelay";
import { createStaff, listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { DRIVER_LICENSE_PLAN, EXTRA_DRIVER_SEEDS, ROUTE_PLAN, SEED_BUSES } from "./mock";
import type {
  Bus,
  BusFormValues,
  BusLiveStatus,
  BusLiveStatusRow,
  Driver,
  DriverFormValues,
  DriverProfile,
  RouteStop,
  RouteStopFormValues,
  StudentTransportAssignment,
  StudentTransportAssignmentFormValues,
  StudentTransportAssignmentRow,
  TransportRoute,
  TransportRouteFormValues,
} from "./types";

const BUSES_KEY = "sms-mock-transport-buses";
const DRIVER_PROFILES_KEY = "sms-mock-transport-driver-profiles";
const ROUTES_KEY = "sms-mock-transport-routes";
const STOPS_KEY = "sms-mock-transport-stops";
const ASSIGNMENTS_KEY = "sms-mock-transport-assignments";
const LIVE_STATUS_KEY = "sms-mock-transport-live-status";
const SEEDED_KEY = "sms-mock-transport-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function requireEntity<T extends { id: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`${label} not found`);
  return found;
}

let buses = loadJson<Bus[]>(BUSES_KEY, []);
let driverProfiles = loadJson<DriverProfile[]>(DRIVER_PROFILES_KEY, []);
let routes = loadJson<TransportRoute[]>(ROUTES_KEY, []);
let stops = loadJson<RouteStop[]>(STOPS_KEY, []);
let assignments = loadJson<StudentTransportAssignment[]>(ASSIGNMENTS_KEY, []);
let liveStatuses = loadJson<BusLiveStatus[]>(LIVE_STATUS_KEY, []);

const persistBuses = () => saveJson(BUSES_KEY, buses);
const persistDriverProfiles = () => saveJson(DRIVER_PROFILES_KEY, driverProfiles);
const persistRoutes = () => saveJson(ROUTES_KEY, routes);
const persistStops = () => saveJson(STOPS_KEY, stops);
const persistAssignments = () => saveJson(ASSIGNMENTS_KEY, assignments);
const persistLiveStatuses = () => saveJson(LIVE_STATUS_KEY, liveStatuses);

/**
 * Drivers are staff members with designation "Driver" (see staff/mock.ts + EXTRA_DRIVER_SEEDS
 * here) with license/experience data layered on top, buses/routes/stops/assignments are owned
 * outright by this module — same conventions the teachers and library modules use.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  const existingStaff = await listStaff();
  const staffIdByEmail = new Map(existingStaff.map((s) => [s.email.toLowerCase(), s.id] as const));

  const toCreate = EXTRA_DRIVER_SEEDS.filter((d) => !staffIdByEmail.has(d.email.toLowerCase()));
  const created = await Promise.all(toCreate.map((values) => createStaff(values)));
  for (const member of created) staffIdByEmail.set(member.email.toLowerCase(), member.id);

  if (driverProfiles.length === 0) {
    const newProfiles: DriverProfile[] = [];
    for (const plan of DRIVER_LICENSE_PLAN) {
      const staffId = staffIdByEmail.get(plan.driverEmail.toLowerCase());
      if (!staffId) continue;
      newProfiles.push({
        id: genId("drv"),
        staffId,
        licenseNumber: plan.licenseNumber,
        licenseExpiryDate: plan.licenseExpiryDate,
        experienceYears: plan.experienceYears,
        status: "active",
      });
    }
    driverProfiles = newProfiles;
    persistDriverProfiles();
  }
  const driverProfileIdByStaffId = new Map(driverProfiles.map((d) => [d.staffId, d.id] as const));
  const driverProfileIdByEmail = new Map(
    DRIVER_LICENSE_PLAN.map((p) => {
      const staffId = staffIdByEmail.get(p.driverEmail.toLowerCase());
      return [p.driverEmail.toLowerCase(), staffId ? driverProfileIdByStaffId.get(staffId) : undefined] as const;
    }),
  );

  if (buses.length === 0) {
    buses = SEED_BUSES.map((b) => ({ ...b }));
    persistBuses();
  }

  if (routes.length === 0) {
    const newRoutes: TransportRoute[] = [];
    const newStops: RouteStop[] = [];
    for (const plan of ROUTE_PLAN) {
      newRoutes.push({
        id: plan.id,
        name: plan.name,
        busId: plan.busId,
        driverId: driverProfileIdByEmail.get(plan.driverEmail.toLowerCase()),
        startTime: plan.startTime,
        endTime: plan.endTime,
        status: plan.status,
      });
      plan.stops.forEach((stop, index) => {
        newStops.push({
          id: genId("stop"),
          routeId: plan.id,
          name: stop.name,
          sequence: index + 1,
          arrivalTime: stop.arrivalTime,
          landmark: stop.landmark,
        });
      });
    }
    routes = newRoutes;
    stops = newStops;
    persistRoutes();
    persistStops();
  }

  if (assignments.length === 0) {
    const students = await listStudents();
    const activeRoutes = routes.filter((r) => r.status === "active");
    const stopsByRoute = new Map(activeRoutes.map((r) => [r.id, stops.filter((s) => s.routeId === r.id).sort((a, b) => a.sequence - b.sequence)] as const));
    const eligible = students.filter((s) => s.status === "active");
    const target = Math.min(eligible.length, 28);
    const newAssignments: StudentTransportAssignment[] = [];
    for (let i = 0; i < target; i++) {
      const student = eligible[i];
      const route = activeRoutes[i % activeRoutes.length];
      const routeStops = stopsByRoute.get(route?.id ?? "") ?? [];
      const stop = routeStops[i % routeStops.length];
      if (!student || !route || !stop) continue;
      newAssignments.push({
        id: genId("tra"),
        studentId: student.id,
        routeId: route.id,
        stopId: stop.id,
        monthlyFee: 1000 + stop.sequence * 50,
        assignedOn: new Date(Date.now() - (i % 60) * 24 * 60 * 60 * 1000).toISOString(),
        status: i % 11 === 0 ? "inactive" : "active",
      });
    }
    assignments = newAssignments;
    persistAssignments();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed transport mock data", err);
});

function toDriver(profile: DriverProfile, staffById: Map<string, StaffMember>): Driver | null {
  const staff = staffById.get(profile.staffId);
  if (!staff) return null;
  return { ...profile, staff };
}

function toAssignmentRow(
  assignment: StudentTransportAssignment,
  studentById: Map<string, Student>,
  routeById: Map<string, TransportRoute>,
  stopById: Map<string, RouteStop>,
): StudentTransportAssignmentRow | null {
  const student = studentById.get(assignment.studentId);
  const route = routeById.get(assignment.routeId);
  const stop = stopById.get(assignment.stopId);
  if (!student || !route || !stop) return null;
  return { ...assignment, student, route, stop };
}

// ── Buses ────────────────────────────────────────────────────────────────

export async function listBuses(): Promise<Bus[]> {
  await seedPromise;
  return mockDelay([...buses], 300);
}

export async function createBus(values: BusFormValues): Promise<Bus> {
  await seedPromise;
  if (buses.some((b) => b.regNumber.toLowerCase() === values.regNumber.trim().toLowerCase())) {
    await mockDelay(null, 300);
    throw new Error("A bus with this registration number already exists");
  }
  const bus: Bus = { id: genId("bus"), ...values, regNumber: values.regNumber.trim() };
  buses = [bus, ...buses];
  persistBuses();
  return mockDelay(bus, 350);
}

export async function updateBus(id: string, values: BusFormValues): Promise<Bus> {
  await seedPromise;
  requireEntity(buses, id, "Bus");
  const updated: Bus = { ...requireEntity(buses, id, "Bus"), ...values, regNumber: values.regNumber.trim() };
  buses = buses.map((b) => (b.id === id ? updated : b));
  persistBuses();
  return mockDelay(updated, 350);
}

export async function deleteBus(id: string): Promise<void> {
  await seedPromise;
  requireEntity(buses, id, "Bus");
  if (routes.some((r) => r.busId === id)) {
    await mockDelay(null, 300);
    throw new Error("Unassign this bus from its route before deleting it");
  }
  buses = buses.filter((b) => b.id !== id);
  liveStatuses = liveStatuses.filter((l) => l.busId !== id);
  persistBuses();
  persistLiveStatuses();
  return mockDelay(undefined, 300);
}

// ── Drivers ──────────────────────────────────────────────────────────────

export async function listDrivers(): Promise<Driver[]> {
  await seedPromise;
  const staff = await listStaff();
  const staffById = new Map(staff.map((s) => [s.id, s] as const));
  const result = driverProfiles.map((p) => toDriver(p, staffById)).filter((d): d is Driver => d !== null);
  return mockDelay(result, 350);
}

/** Staff with designation "Driver" who don't already have a transport driver profile. */
export async function listEligibleDriverStaff(): Promise<StaffMember[]> {
  await seedPromise;
  const staff = await listStaff();
  const profiledStaffIds = new Set(driverProfiles.map((p) => p.staffId));
  const result = staff.filter((s) => s.designation === "Driver" && !profiledStaffIds.has(s.id));
  return mockDelay(result, 300);
}

export async function createDriver(values: DriverFormValues): Promise<Driver> {
  await seedPromise;
  if (driverProfiles.some((p) => p.staffId === values.staffId)) {
    await mockDelay(null, 300);
    throw new Error("This staff member already has a driver profile");
  }
  const staff = await listStaff();
  const staffMember = staff.find((s) => s.id === values.staffId);
  if (!staffMember) {
    await mockDelay(null, 300);
    throw new Error("Staff member not found");
  }
  const profile: DriverProfile = { id: genId("drv"), ...values };
  driverProfiles = [profile, ...driverProfiles];
  persistDriverProfiles();
  return mockDelay({ ...profile, staff: staffMember }, 400);
}

export async function updateDriver(id: string, values: DriverFormValues): Promise<Driver> {
  await seedPromise;
  const existing = requireEntity(driverProfiles, id, "Driver");
  const staff = await listStaff();
  const staffMember = staff.find((s) => s.id === existing.staffId);
  if (!staffMember) {
    await mockDelay(null, 300);
    throw new Error("Staff member not found");
  }
  const updated: DriverProfile = { ...existing, licenseNumber: values.licenseNumber, licenseExpiryDate: values.licenseExpiryDate, experienceYears: values.experienceYears, status: values.status };
  driverProfiles = driverProfiles.map((p) => (p.id === id ? updated : p));
  persistDriverProfiles();
  return mockDelay({ ...updated, staff: staffMember }, 400);
}

export async function deleteDriver(id: string): Promise<void> {
  await seedPromise;
  requireEntity(driverProfiles, id, "Driver");
  if (routes.some((r) => r.driverId === id)) {
    await mockDelay(null, 300);
    throw new Error("Unassign this driver from their route before deleting the profile");
  }
  driverProfiles = driverProfiles.filter((p) => p.id !== id);
  persistDriverProfiles();
  return mockDelay(undefined, 300);
}

// ── Routes ───────────────────────────────────────────────────────────────

export async function listRoutes(): Promise<TransportRoute[]> {
  await seedPromise;
  return mockDelay([...routes], 300);
}

export async function createRoute(values: TransportRouteFormValues): Promise<TransportRoute> {
  await seedPromise;
  const route: TransportRoute = { id: genId("rt"), ...values };
  routes = [route, ...routes];
  persistRoutes();
  return mockDelay(route, 350);
}

export async function updateRoute(id: string, values: TransportRouteFormValues): Promise<TransportRoute> {
  await seedPromise;
  requireEntity(routes, id, "Route");
  const updated: TransportRoute = { ...requireEntity(routes, id, "Route"), ...values };
  routes = routes.map((r) => (r.id === id ? updated : r));
  persistRoutes();
  if (updated.status === "inactive") {
    liveStatuses = liveStatuses.filter((l) => l.routeId !== id);
    persistLiveStatuses();
  }
  return mockDelay(updated, 350);
}

export async function deleteRoute(id: string): Promise<void> {
  await seedPromise;
  requireEntity(routes, id, "Route");
  if (assignments.some((a) => a.routeId === id && a.status === "active")) {
    await mockDelay(null, 300);
    throw new Error("Reassign or remove students on this route before deleting it");
  }
  routes = routes.filter((r) => r.id !== id);
  stops = stops.filter((s) => s.routeId !== id);
  liveStatuses = liveStatuses.filter((l) => l.routeId !== id);
  persistRoutes();
  persistStops();
  persistLiveStatuses();
  return mockDelay(undefined, 300);
}

// ── Stops ────────────────────────────────────────────────────────────────

export async function listStops(routeId?: string): Promise<RouteStop[]> {
  await seedPromise;
  const result = (routeId ? stops.filter((s) => s.routeId === routeId) : [...stops]).sort((a, b) => a.sequence - b.sequence);
  return mockDelay(result, 300);
}

export async function addStop(routeId: string, values: RouteStopFormValues): Promise<RouteStop> {
  await seedPromise;
  requireEntity(routes, routeId, "Route");
  const nextSequence = stops.filter((s) => s.routeId === routeId).reduce((max, s) => Math.max(max, s.sequence), 0) + 1;
  const stop: RouteStop = { id: genId("stop"), routeId, sequence: nextSequence, ...values };
  stops = [...stops, stop];
  persistStops();
  return mockDelay(stop, 350);
}

export async function updateStop(id: string, values: RouteStopFormValues): Promise<RouteStop> {
  await seedPromise;
  const existing = requireEntity(stops, id, "Stop");
  const updated: RouteStop = { ...existing, ...values };
  stops = stops.map((s) => (s.id === id ? updated : s));
  persistStops();
  return mockDelay(updated, 350);
}

export async function deleteStop(id: string): Promise<void> {
  await seedPromise;
  requireEntity(stops, id, "Stop");
  if (assignments.some((a) => a.stopId === id && a.status === "active")) {
    await mockDelay(null, 300);
    throw new Error("Reassign students at this stop before deleting it");
  }
  stops = stops.filter((s) => s.id !== id);
  persistStops();
  return mockDelay(undefined, 300);
}

export async function moveStop(id: string, direction: "up" | "down"): Promise<RouteStop[]> {
  await seedPromise;
  const stop = requireEntity(stops, id, "Stop");
  const siblings = stops.filter((s) => s.routeId === stop.routeId).sort((a, b) => a.sequence - b.sequence);
  const index = siblings.findIndex((s) => s.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) {
    await mockDelay(null, 200);
    throw new Error("Stop is already at the end of the route");
  }
  const other = siblings[swapIndex]!;
  const stopSeq = stop.sequence;
  stop.sequence = other.sequence;
  other.sequence = stopSeq;
  stops = stops.map((s) => {
    if (s.id === stop.id) return stop;
    if (s.id === other.id) return other;
    return s;
  });
  persistStops();
  return mockDelay(stops.filter((s) => s.routeId === stop.routeId).sort((a, b) => a.sequence - b.sequence), 250);
}

// ── Student assignments ─────────────────────────────────────────────────

export async function listAssignments(): Promise<StudentTransportAssignmentRow[]> {
  await seedPromise;
  const [students] = await Promise.all([listStudents()]);
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const routeById = new Map(routes.map((r) => [r.id, r] as const));
  const stopById = new Map(stops.map((s) => [s.id, s] as const));
  const rows = assignments
    .map((a) => toAssignmentRow(a, studentById, routeById, stopById))
    .filter((r): r is StudentTransportAssignmentRow => r !== null);
  return mockDelay(rows, 350);
}

export async function createAssignment(values: StudentTransportAssignmentFormValues): Promise<StudentTransportAssignment> {
  await seedPromise;
  const stop = requireEntity(stops, values.stopId, "Stop");
  if (stop.routeId !== values.routeId) {
    await mockDelay(null, 300);
    throw new Error("The selected stop does not belong to the selected route");
  }
  if (assignments.some((a) => a.studentId === values.studentId && a.status === "active")) {
    await mockDelay(null, 300);
    throw new Error("This student already has an active transport assignment");
  }
  const assignment: StudentTransportAssignment = {
    id: genId("tra"),
    ...values,
    assignedOn: new Date().toISOString(),
    status: "active",
  };
  assignments = [assignment, ...assignments];
  persistAssignments();
  return mockDelay(assignment, 400);
}

export async function updateAssignment(id: string, values: StudentTransportAssignmentFormValues): Promise<StudentTransportAssignment> {
  await seedPromise;
  const existing = requireEntity(assignments, id, "Assignment");
  const stop = requireEntity(stops, values.stopId, "Stop");
  if (stop.routeId !== values.routeId) {
    await mockDelay(null, 300);
    throw new Error("The selected stop does not belong to the selected route");
  }
  const updated: StudentTransportAssignment = { ...existing, ...values };
  assignments = assignments.map((a) => (a.id === id ? updated : a));
  persistAssignments();
  return mockDelay(updated, 400);
}

export async function setAssignmentStatus(id: string, status: "active" | "inactive"): Promise<StudentTransportAssignment> {
  await seedPromise;
  const existing = requireEntity(assignments, id, "Assignment");
  if (status === "active" && assignments.some((a) => a.studentId === existing.studentId && a.status === "active" && a.id !== id)) {
    await mockDelay(null, 300);
    throw new Error("This student already has another active transport assignment");
  }
  const updated: StudentTransportAssignment = { ...existing, status };
  assignments = assignments.map((a) => (a.id === id ? updated : a));
  persistAssignments();
  return mockDelay(updated, 300);
}

export async function deleteAssignment(id: string): Promise<void> {
  await seedPromise;
  requireEntity(assignments, id, "Assignment");
  assignments = assignments.filter((a) => a.id !== id);
  persistAssignments();
  return mockDelay(undefined, 300);
}

// ── Live tracking (simulated GPS) ───────────────────────────────────────

export async function listLiveStatuses(): Promise<BusLiveStatusRow[]> {
  await seedPromise;
  const trackableRoutes = routes.filter((r) => r.status === "active" && r.busId);
  const busById = new Map(buses.map((b) => [b.id, b] as const));

  let changed = false;
  for (const route of trackableRoutes) {
    if (!liveStatuses.some((l) => l.busId === route.busId)) {
      liveStatuses.push({ busId: route.busId!, routeId: route.id, status: "idle", currentStopIndex: -1, speedKmph: 0, lastUpdated: new Date().toISOString() });
      changed = true;
    }
  }
  if (changed) persistLiveStatuses();

  const rows: BusLiveStatusRow[] = liveStatuses
    .map((status) => {
      const route = routes.find((r) => r.id === status.routeId);
      const bus = busById.get(status.busId);
      if (!route || !bus || route.status !== "active") return null;
      const routeStops = stops.filter((s) => s.routeId === route.id).sort((a, b) => a.sequence - b.sequence);
      return { ...status, bus, route, stops: routeStops };
    })
    .filter((r): r is BusLiveStatusRow => r !== null);

  return mockDelay(rows, 350);
}

export async function simulateGpsPing(busId: string): Promise<BusLiveStatus> {
  await seedPromise;
  const current = liveStatuses.find((l) => l.busId === busId);
  if (!current) {
    await mockDelay(null, 300);
    throw new Error("This bus is not currently on a trackable route");
  }
  const routeStops = stops.filter((s) => s.routeId === current.routeId).sort((a, b) => a.sequence - b.sequence);
  const lastIndex = routeStops.length - 1;

  let next: BusLiveStatus;
  if (current.status === "idle") {
    next = { ...current, status: "on-route", speedKmph: 25 + Math.round(Math.random() * 20), lastUpdated: new Date().toISOString() };
  } else if (current.status === "on-route") {
    const arrivedIndex = current.currentStopIndex + 1;
    next = { ...current, status: "at-stop", currentStopIndex: arrivedIndex, speedKmph: 0, lastUpdated: new Date().toISOString() };
  } else if (current.status === "at-stop") {
    if (current.currentStopIndex >= lastIndex) {
      next = { ...current, status: "completed", speedKmph: 0, lastUpdated: new Date().toISOString() };
    } else {
      next = { ...current, status: "on-route", speedKmph: 20 + Math.round(Math.random() * 25), lastUpdated: new Date().toISOString() };
    }
  } else {
    next = { ...current, status: "idle", currentStopIndex: -1, speedKmph: 0, lastUpdated: new Date().toISOString() };
  }

  liveStatuses = liveStatuses.map((l) => (l.busId === busId ? next : l));
  persistLiveStatuses();
  return mockDelay(next, 300);
}

export async function resetLiveStatus(busId: string): Promise<BusLiveStatus> {
  await seedPromise;
  const current = liveStatuses.find((l) => l.busId === busId);
  if (!current) {
    await mockDelay(null, 300);
    throw new Error("This bus is not currently on a trackable route");
  }
  const next: BusLiveStatus = { ...current, status: "idle", currentStopIndex: -1, speedKmph: 0, lastUpdated: new Date().toISOString() };
  liveStatuses = liveStatuses.map((l) => (l.busId === busId ? next : l));
  persistLiveStatuses();
  return mockDelay(next, 250);
}
