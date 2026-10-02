import * as hostel from "./api";
import { campusHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";

vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [
    { id: "w1", firstName: "Lalitha", designation: "Warden" },
    { id: "w2", firstName: "Joseph", designation: "Warden" },
    { id: "t1", firstName: "Meera", designation: "Teacher" },
  ]),
}));
vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [{ id: "st1", firstName: "Asha" }, { id: "st2", firstName: "Ravi" }]),
}));

const apiHostel = (overrides: Record<string, unknown> = {}) => ({ id: "h1", tenantId: "t", branchId: "b", name: "Girls Block", type: "CoEd", wardenStaffId: "w1", address: null, status: "Active", ...overrides });
const apiRoom = (id: string, hostelId: string, capacity: number, overrides: Record<string, unknown> = {}) => ({
  id, tenantId: "t", branchId: "b", hostelId, roomNumber: id.toUpperCase(), floor: "1", capacity, roomType: "Triple", status: "Maintenance", occupiedBeds: 1, ...overrides,
});
const apiAllocation = (overrides: Record<string, unknown> = {}) => ({
  id: "al1", tenantId: "t", branchId: "b", studentId: "st1", hostelId: "h1", roomId: "r1", bedNumber: 1, monthlyFee: null, allocatedOn: "", vacatedOn: null, status: "Active", ...overrides,
});

const routes = {
  "GET /api/hostels": [apiHostel(), apiHostel({ id: "h2", type: "?", status: "?", wardenStaffId: null })],
  "GET /api/rooms": [apiRoom("r1", "h1", 3), apiRoom("r2", "h1", 2, { roomType: "?", status: "?" }), apiRoom("r3", "h2", 4)],
  "GET /api/hostelallocations": [apiAllocation(), apiAllocation({ id: "al2", studentId: "st2", status: "Vacated" }), apiAllocation({ id: "al3", studentId: "gone" })],
};

describe("hostel api", () => {
  it("composes hostel rows with warden, rooms, beds and live occupancy", async () => {
    stubClient(campusHttpClient, routes);

    const [girls, other] = await hostel.listHostels();

    expect(girls).toMatchObject({ type: "co-ed", address: undefined, roomCount: 2, bedCount: 5, occupiedCount: 2, warden: { firstName: "Lalitha" } });
    expect(other).toMatchObject({ type: "boys", status: "active", roomCount: 1, bedCount: 4, occupiedCount: 0, warden: undefined });
  });

  it("offers wardens not already looking after another hostel", async () => {
    stubClient(campusHttpClient, routes);

    expect((await hostel.listEligibleWardenStaff()).map((s) => s.id)).toEqual(["w2"]);
    expect((await hostel.listEligibleWardenStaff("h1")).map((s) => s.id)).toEqual(["w1", "w2"]);
  });

  it("hostel and room mutations", async () => {
    const calls = stubClient(campusHttpClient, {
      ...routes,
      "POST /api/hostels": apiHostel(),
      "PUT /api/hostels/h1": apiHostel(),
      "DELETE /api/hostels/h1": null,
      "POST /api/rooms": apiRoom("r9", "h1", 2),
      "PUT /api/rooms/r9": apiRoom("r9", "h1", 2),
      "DELETE /api/rooms/r9": null,
    });

    await hostel.createHostel({ name: "Girls Block", type: "girls", wardenStaffId: "", address: "  ", status: "inactive" } as never);
    await hostel.updateHostel("h1", { name: "Girls Block", type: "boys", wardenStaffId: "w2", address: " Road ", status: "active" } as never);
    await hostel.deleteHostel("h1");
    const room = await hostel.addRoom("h1", { roomNumber: " 101 ", floor: "1", capacity: 2, roomType: "single", status: "active" } as never);
    await hostel.updateRoom("r9", { roomNumber: "102", floor: "1", capacity: 3, roomType: "dormitory", status: "maintenance" } as never);
    await hostel.deleteRoom("r9");
    expect((await hostel.listRooms("h1"))[1]).toMatchObject({ roomType: "double", status: "active" });

    expect(calls[0].body).toEqual({ name: "Girls Block", type: "Girls", wardenStaffId: null, address: null, status: "Inactive" });
    expect(calls[1].body).toEqual({ name: "Girls Block", type: "Boys", wardenStaffId: "w2", address: "Road", status: "Active" });
    expect(calls[3].body).toEqual({ hostelId: "h1", roomNumber: "101", floor: "1", capacity: 2, roomType: "Single", status: "Active" });
    expect(calls[4].body).toMatchObject({ roomType: "Dormitory", status: "Maintenance" });
    expect(room).not.toHaveProperty("occupiedBeds");
    expect((calls.at(-1)!.config as { params: unknown }).params).toEqual({ hostelId: "h1" });
  });

  it("allocations join student/hostel/room, and residents are the active ones", async () => {
    const calls = stubClient(campusHttpClient, {
      ...routes,
      "POST /api/hostelallocations": apiAllocation({ monthlyFee: 3000 }),
      "POST /api/hostelallocations/al1/vacate": apiAllocation({ status: "Vacated", vacatedOn: "2026-10-01" }),
      "DELETE /api/hostelallocations/al1": null,
    });

    const rows = await hostel.listAllocations();
    const residents = await hostel.listActiveResidents();
    await hostel.allocateStudent({ studentId: "st1", hostelId: "h1", roomId: "r1" } as never);
    expect((await hostel.vacateAllocation("al1")).status).toBe("vacated");
    await hostel.deleteAllocation("al1");

    expect(rows.map((r) => r.id)).toEqual(["al1", "al2"]);
    expect(rows[0].room).not.toHaveProperty("occupiedBeds");
    expect(residents.map((r) => r.id)).toEqual(["al1"]);
    expect(calls.find((c) => c.url === "/api/hostelallocations" && c.method === "POST")?.body).toEqual({ studentId: "st1", hostelId: "h1", roomId: "r1", monthlyFee: null });
  });

  it("visitor register", async () => {
    const log = { id: "v1", tenantId: "t", branchId: "b", hostelId: "h1", studentId: "st1", visitorName: "Mom", relation: "Mother", phone: "1", purpose: null, checkInAt: "", checkOutAt: null, status: "CheckedIn" };
    const calls = stubClient(campusHttpClient, {
      ...routes,
      "GET /api/visitorlogs": [log, { ...log, id: "v2", hostelId: "gone" }, { ...log, id: "v3", status: "?" }],
      "POST /api/visitorlogs": log,
      "POST /api/visitorlogs/v1/check-out": { ...log, status: "CheckedOut", checkOutAt: "x" },
    });

    expect((await hostel.listVisitorLogs()).map((v) => [v.id, v.status])).toEqual([["v1", "checked-in"], ["v3", "checked-in"]]);
    await hostel.checkInVisitor({ hostelId: "h1", studentId: "st1", visitorName: "Mom", relation: "Mother", phone: "1", purpose: " " } as never);
    expect((await hostel.checkOutVisitor("v1")).status).toBe("checked-out");
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({ purpose: null });
  });

  it("attendance, fees and mess menu", async () => {
    const payment = { id: "fp1", tenantId: "t", branchId: "b", allocationId: "al1", month: "2026-09", amount: 3000, status: "Paid", paidOn: null };
    const calls = stubClient(campusHttpClient, {
      ...routes,
      "GET /api/hostelattendance": [{ id: "ha1", tenantId: "t", branchId: "b", studentId: "st1", date: "2026-10-01", status: "OnLeave" }, { id: "ha2", status: "?" }],
      "PUT /api/hostelattendance": null,
      "GET /api/hostelfeepayments": [payment, { ...payment, id: "fp2", allocationId: "missing" }, { ...payment, id: "fp3", status: "?" }],
      "POST /api/hostelfeepayments/generate": { createdCount: 12 },
      "POST /api/hostelfeepayments/fp1/mark-paid": payment,
      "GET /api/messmenu": [{ id: "mm1", tenantId: "t", branchId: "b", hostelId: "h1", day: "Friday", meal: "Snacks", items: "Vada" }, { id: "mm2", day: "?", meal: "?", items: "" }],
      "PUT /api/messmenu/mm1": { id: "mm1", tenantId: "t", branchId: "b", hostelId: "h1", day: "Friday", meal: "Snacks", items: "Samosa" },
    });

    expect((await hostel.getHostelAttendanceForDate("2026-10-01")).map((r) => r.status)).toEqual(["on-leave", "present"]);
    await hostel.saveHostelAttendance("2026-10-01", [{ studentId: "st1", status: "absent" }]);
    expect((await hostel.listFeePayments()).map((p) => [p.id, p.status])).toEqual([["fp1", "paid"], ["fp3", "pending"]]);
    expect(await hostel.generateFeePaymentsForMonth("2026-10")).toBe(12);
    expect((await hostel.markFeePaymentPaid("fp1")).paidOn).toBeUndefined();
    expect((await hostel.listMessMenu("h1")).map((m) => [m.day, m.meal])).toEqual([["friday", "snacks"], ["monday", "breakfast"]]);
    expect((await hostel.updateMessMenuEntry("mm1", "Samosa")).items).toBe("Samosa");

    expect(calls.find((c) => c.method === "PUT" && c.url === "/api/hostelattendance")?.body).toEqual({ date: "2026-10-01", entries: [{ studentId: "st1", status: "Absent" }] });
  });
});
