import * as transport from "./api";
import { campusHttpClient } from "@/lib/httpClient";
import { checkCrud } from "@/test/crud";
import { stubClient } from "@/test/utils";

vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [
    { id: "sf1", firstName: "Babu", designation: "Driver" },
    { id: "sf2", firstName: "Joy", designation: "Driver" },
    { id: "sf3", firstName: "Meera", designation: "Teacher" },
  ]),
}));
vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [{ id: "st1", firstName: "Asha" }]),
}));

const bus = { id: "bus1", tenantId: "t", branchId: "b", regNumber: "KL-10-A-1", model: "Tata", capacity: 40, manufactureYear: 2020, gpsDeviceId: null, status: "Maintenance" };
const profile = { id: "dp1", tenantId: "t", branchId: "b", staffId: "sf1", licenseNumber: "DL-1", licenseExpiryDate: "2028-01-01", experienceYears: 5, status: "OnLeave" };
const route = (overrides: Record<string, unknown> = {}) => ({ id: "rt1", tenantId: "t", branchId: "b", name: "Route 1", busId: "bus1", driverId: null, startTime: "07:00", endTime: "08:30", status: "Active", ...overrides });
const stop = (id: string, sequence: number, routeId = "rt1") => ({ id, tenantId: "t", branchId: "b", routeId, name: `Stop ${id}`, sequence, arrivalTime: "07:10", landmark: null });
const live = (overrides: Record<string, unknown> = {}) => ({ id: "lv1", tenantId: "t", branchId: "b", busId: "bus1", routeId: "rt1", status: "AtStop", currentStopIndex: 1, speedKmph: 0, lastUpdated: "", ...overrides });

describe("transport api", () => {
  it("buses trim the registration and GPS id", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/buses",
      dto: bus,
      values: { regNumber: " KL-10-A-1 ", model: "Tata", capacity: 40, manufactureYear: 2020, gpsDeviceId: "  ", status: "inactive" } as never,
      list: transport.listBuses,
      create: transport.createBus,
      update: transport.updateBus,
      remove: transport.deleteBus,
      sent: { regNumber: "KL-10-A-1", model: "Tata", capacity: 40, manufactureYear: 2020, gpsDeviceId: null, status: "Inactive" },
      mapped: { status: "maintenance", gpsDeviceId: undefined },
      fallback: { dto: { ...bus, id: "bus2", status: "?" }, mapped: { status: "active" } },
    }));

  it("drivers join their staff record and skip orphans", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/driverprofiles": [profile, { ...profile, id: "dp2", staffId: "gone", status: "?" }],
      "POST /api/driverprofiles": profile,
      "PUT /api/driverprofiles/dp1": profile,
      "DELETE /api/driverprofiles/dp1": null,
    });

    const drivers = await transport.listDrivers();
    const eligible = await transport.listEligibleDriverStaff();
    const created = await transport.createDriver({ staffId: "sf1", licenseNumber: "DL-1", licenseExpiryDate: "2028-01-01", experienceYears: 5, status: "active" } as never);
    await transport.updateDriver("dp1", { staffId: "sf1", licenseNumber: "DL-2", licenseExpiryDate: "2029-01-01", experienceYears: 6, status: "inactive" } as never);
    await transport.deleteDriver("dp1");

    expect(drivers).toHaveLength(1);
    expect(drivers[0]).toMatchObject({ status: "on-leave", staff: { firstName: "Babu" } });
    expect(eligible.map((s) => s.id)).toEqual(["sf2"]);
    expect(created.staff.firstName).toBe("Babu");
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({ status: "Active" });
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({ licenseNumber: "DL-2", licenseExpiryDate: "2029-01-01", experienceYears: 6, status: "Inactive" });
    await expect(transport.createDriver({ staffId: "nobody" } as never)).rejects.toThrow("Staff member not found");
  });

  it("updateDriver fails if the profile's staff member disappeared", async () => {
    stubClient(campusHttpClient, { "PUT /api/driverprofiles/dp9": { ...profile, id: "dp9", staffId: "gone" } });
    await expect(transport.updateDriver("dp9", { status: "active" } as never)).rejects.toThrow("Staff member not found");
  });

  it("routes", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/transportroutes",
      dto: route(),
      values: { name: "Route 1", startTime: "07:00", endTime: "08:30", status: "inactive" } as never,
      list: transport.listRoutes,
      create: transport.createRoute,
      update: transport.updateRoute,
      remove: transport.deleteRoute,
      sent: { name: "Route 1", busId: null, driverId: null, startTime: "07:00", endTime: "08:30", status: "Inactive" },
      mapped: { status: "active", driverId: undefined },
      fallback: { dto: route({ id: "rt2", status: "?" }), mapped: { status: "active" } },
    }));

  it("stops come back ordered by sequence and can be moved", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/routestops": [stop("s2", 2), stop("s1", 1)],
      "POST /api/routestops": stop("s3", 3),
      "PUT /api/routestops/s1": stop("s1", 1),
      "DELETE /api/routestops/s1": null,
      "POST /api/routestops/s2/move": [stop("s2", 1), stop("s1", 2)],
    });

    expect((await transport.listStops("rt1")).map((s) => s.id)).toEqual(["s1", "s2"]);
    await transport.addStop("rt1", { name: "Temple", arrivalTime: "07:20", landmark: " Near temple " } as never);
    await transport.updateStop("s1", { name: "Junction", arrivalTime: "07:05" } as never);
    await transport.deleteStop("s1");
    expect((await transport.moveStop("s2", "up")).map((s) => s.id)).toEqual(["s2", "s1"]);

    expect((calls[0].config as { params: unknown }).params).toEqual({ routeId: "rt1" });
    expect(calls[1].body).toEqual({ routeId: "rt1", name: "Temple", arrivalTime: "07:20", landmark: "Near temple" });
    expect(calls[2].body).toEqual({ name: "Junction", arrivalTime: "07:05", landmark: null });
    expect(calls[4].body).toEqual({ direction: "up" });
  });

  it("assignments join student, route and stop, dropping incomplete rows", async () => {
    const assignment = { id: "as1", tenantId: "t", branchId: "b", studentId: "st1", routeId: "rt1", stopId: "s1", monthlyFee: null, assignedOn: "", status: "Inactive" };
    const calls = stubClient(campusHttpClient, {
      "GET /api/studenttransportassignments": [assignment, { ...assignment, id: "as2", studentId: "gone" }],
      "GET /api/transportroutes": [route()],
      "GET /api/routestops": [stop("s1", 1)],
      "POST /api/studenttransportassignments": assignment,
      "PUT /api/studenttransportassignments/as1": assignment,
      "POST /api/studenttransportassignments/as1/status": { ...assignment, status: "Active" },
      "DELETE /api/studenttransportassignments/as1": null,
    });

    const rows = await transport.listAssignments();
    await transport.createAssignment({ studentId: "st1", routeId: "rt1", stopId: "s1" } as never);
    await transport.updateAssignment("as1", { studentId: "st1", routeId: "rt1", stopId: "s1", monthlyFee: 800 } as never);
    expect((await transport.setAssignmentStatus("as1", "active")).status).toBe("active");
    await transport.deleteAssignment("as1");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "inactive", monthlyFee: undefined, student: { firstName: "Asha" }, route: { name: "Route 1" } });
    expect(calls.find((c) => c.method === "PUT")?.body).toMatchObject({ monthlyFee: 800 });
    expect(calls.find((c) => c.url.endsWith("/status"))?.body).toEqual({ status: "Active" });
  });

  it("live tracking shows active routes with their ordered stops", async () => {
    stubClient(campusHttpClient, {
      "GET /api/buslivestatuses": [live(), live({ id: "lv2", routeId: "rt2" }), live({ id: "lv3", busId: "nobus" }), live({ id: "lv4", status: "?" , routeId: "rt1"})],
      "GET /api/buses": [bus],
      "GET /api/transportroutes": [route(), route({ id: "rt2", status: "Inactive" })],
      "GET /api/routestops": [stop("s2", 2), stop("s1", 1), stop("x", 1, "rt2")],
      "POST /api/buslivestatuses/bus1/simulate-ping": live({ status: "OnRoute", speedKmph: 30 }),
      "POST /api/buslivestatuses/bus1/reset": live({ status: "Idle", currentStopIndex: -1 }),
    });

    const rows = await transport.listLiveStatuses();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ status: "at-stop", bus: { regNumber: "KL-10-A-1" } });
    expect(rows[0].stops.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(rows[1].status).toBe("idle");
    expect(await transport.simulateGpsPing("bus1")).toMatchObject({ status: "on-route", speedKmph: 30 });
    expect(await transport.resetLiveStatus("bus1")).toMatchObject({ status: "idle", currentStopIndex: -1 });
  });
});
