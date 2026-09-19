import { mockDelay } from "@/utils/mockDelay";
import { createStaff, listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { currentMonthKey, previousMonthKey } from "./constants";
import { buildDefaultMessMenu, EXTRA_WARDEN_SEEDS, HOSTEL_PLAN } from "./mock";
import type {
  AllocateStudentFormValues,
  Hostel,
  HostelAllocation,
  HostelAllocationRow,
  HostelAttendanceRecord,
  HostelFeePayment,
  HostelFeePaymentRow,
  HostelFormValues,
  HostelRow,
  MarkHostelAttendanceEntry,
  MessMenuEntry,
  Room,
  RoomFormValues,
  RoomRow,
  VisitorCheckInFormValues,
  VisitorLog,
  VisitorLogRow,
} from "./types";

const HOSTELS_KEY = "sms-mock-hostel-hostels";
const ROOMS_KEY = "sms-mock-hostel-rooms";
const ALLOCATIONS_KEY = "sms-mock-hostel-allocations";
const VISITORS_KEY = "sms-mock-hostel-visitors";
const ATTENDANCE_KEY = "sms-mock-hostel-attendance";
const FEE_PAYMENTS_KEY = "sms-mock-hostel-fee-payments";
const MESS_MENU_KEY = "sms-mock-hostel-mess-menu";
const SEEDED_KEY = "sms-mock-hostel-seeded";

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

let hostels = loadJson<Hostel[]>(HOSTELS_KEY, []);
let rooms = loadJson<Room[]>(ROOMS_KEY, []);
let allocations = loadJson<HostelAllocation[]>(ALLOCATIONS_KEY, []);
let visitorLogs = loadJson<VisitorLog[]>(VISITORS_KEY, []);
let attendanceRecords = loadJson<HostelAttendanceRecord[]>(ATTENDANCE_KEY, []);
let feePayments = loadJson<HostelFeePayment[]>(FEE_PAYMENTS_KEY, []);
let messMenu = loadJson<MessMenuEntry[]>(MESS_MENU_KEY, []);

const persistHostels = () => saveJson(HOSTELS_KEY, hostels);
const persistRooms = () => saveJson(ROOMS_KEY, rooms);
const persistAllocations = () => saveJson(ALLOCATIONS_KEY, allocations);
const persistVisitorLogs = () => saveJson(VISITORS_KEY, visitorLogs);
const persistAttendance = () => saveJson(ATTENDANCE_KEY, attendanceRecords);
const persistFeePayments = () => saveJson(FEE_PAYMENTS_KEY, feePayments);
const persistMessMenu = () => saveJson(MESS_MENU_KEY, messMenu);

const ROOM_TYPE_FEE: Record<Room["roomType"], number> = { single: 6000, double: 4500, triple: 3500, dormitory: 2500 };

/**
 * Wardens are staff members with designation "Warden" (see staff/mock.ts + EXTRA_WARDEN_SEEDS
 * here); hostels/rooms/allocations/visitor logs/attendance/fee payments/mess menu are owned
 * outright by this module — same conventions the transport and library modules use.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  const existingStaff = await listStaff();
  const staffIdByEmail = new Map(existingStaff.map((s) => [s.email.toLowerCase(), s.id] as const));
  const toCreate = EXTRA_WARDEN_SEEDS.filter((w) => !staffIdByEmail.has(w.email.toLowerCase()));
  const created = await Promise.all(toCreate.map((values) => createStaff(values)));
  for (const member of created) staffIdByEmail.set(member.email.toLowerCase(), member.id);

  if (hostels.length === 0) {
    const newHostels: Hostel[] = [];
    const newRooms: Room[] = [];
    const newMenu: MessMenuEntry[] = [];
    for (const plan of HOSTEL_PLAN) {
      newHostels.push({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        wardenStaffId: plan.wardenEmail ? staffIdByEmail.get(plan.wardenEmail.toLowerCase()) : undefined,
        address: plan.address,
        status: plan.status,
      });
      for (const room of plan.rooms) {
        newRooms.push({ id: genId("room"), hostelId: plan.id, ...room });
      }
      for (const entry of buildDefaultMessMenu(plan.id)) {
        newMenu.push({ id: genId("menu"), ...entry });
      }
    }
    hostels = newHostels;
    rooms = newRooms;
    messMenu = newMenu;
    persistHostels();
    persistRooms();
    persistMessMenu();
  }

  if (allocations.length === 0) {
    const students = await listStudents();
    const eligible = students.filter((s) => s.status === "active");
    const activeRooms = rooms.filter((r) => r.status === "active" && hostels.find((h) => h.id === r.hostelId)?.status === "active");

    const newAllocations: HostelAllocation[] = [];
    let studentIndex = 0;
    for (const room of activeRooms) {
      for (let bed = 1; bed <= room.capacity && studentIndex < eligible.length; bed++) {
        // Leave the last bed of every room empty so the seed data shows real vacancy.
        if (bed === room.capacity && room.capacity > 1) continue;
        const student = eligible[studentIndex];
        studentIndex++;
        const isVacated = newAllocations.length % 9 === 0;
        const allocatedOn = new Date(Date.now() - (60 + (studentIndex % 30)) * 24 * 60 * 60 * 1000).toISOString();
        newAllocations.push({
          id: genId("hall"),
          studentId: student.id,
          hostelId: room.hostelId,
          roomId: room.id,
          bedNumber: bed,
          monthlyFee: ROOM_TYPE_FEE[room.roomType],
          allocatedOn,
          vacatedOn: isVacated ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          status: isVacated ? "vacated" : "active",
        });
      }
    }
    allocations = newAllocations;
    persistAllocations();
  }

  if (visitorLogs.length === 0) {
    const activeAllocations = allocations.filter((a) => a.status === "active").slice(0, 4);
    const newLogs: VisitorLog[] = activeAllocations.map((a, index) => {
      const checkInAt = new Date(Date.now() - (index + 1) * 2 * 60 * 60 * 1000).toISOString();
      const checkedOut = index % 2 === 0;
      return {
        id: genId("visit"),
        hostelId: a.hostelId,
        studentId: a.studentId,
        visitorName: index % 2 === 0 ? "Rajesh Kumar" : "Lakshmi Iyer",
        relation: index % 2 === 0 ? "father" : "mother",
        phone: "+91 98450 5" + String(1000 + index),
        purpose: "Weekly visit",
        checkInAt,
        checkOutAt: checkedOut ? new Date(new Date(checkInAt).getTime() + 45 * 60 * 1000).toISOString() : undefined,
        status: checkedOut ? "checked-out" : "checked-in",
      };
    });
    visitorLogs = newLogs;
    persistVisitorLogs();
  }

  if (attendanceRecords.length === 0) {
    const activeAllocations = allocations.filter((a) => a.status === "active");
    const newRecords: HostelAttendanceRecord[] = [];
    for (let dayOffset = 4; dayOffset >= 0; dayOffset--) {
      const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      activeAllocations.forEach((a, index) => {
        const roll = (index + dayOffset) % 12;
        const status = roll === 0 ? "absent" : roll === 6 ? "on-leave" : "present";
        newRecords.push({ id: genId("hatt"), studentId: a.studentId, date, status });
      });
    }
    attendanceRecords = newRecords;
    persistAttendance();
  }

  if (feePayments.length === 0) {
    const activeAllocations = allocations.filter((a) => a.status === "active" && a.monthlyFee);
    const now = new Date();
    const currentMonth = currentMonthKey();
    const prevMonth = previousMonthKey();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const newPayments: HostelFeePayment[] = [];
    activeAllocations.forEach((a, index) => {
      newPayments.push({
        id: genId("hfee"),
        allocationId: a.id,
        month: prevMonth,
        amount: a.monthlyFee!,
        status: "paid",
        paidOn: new Date(prevMonthDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
      newPayments.push({
        id: genId("hfee"),
        allocationId: a.id,
        month: currentMonth,
        amount: a.monthlyFee!,
        status: index % 4 === 0 ? "paid" : "pending",
        paidOn: index % 4 === 0 ? new Date().toISOString() : undefined,
      });
    });
    feePayments = newPayments;
    persistFeePayments();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed hostel mock data", err);
});

// ── Hostels ──────────────────────────────────────────────────────────────

export async function listHostels(): Promise<HostelRow[]> {
  await seedPromise;
  const staff = await listStaff();
  const staffById = new Map(staff.map((s) => [s.id, s] as const));
  const rows: HostelRow[] = hostels.map((h) => {
    const hostelRooms = rooms.filter((r) => r.hostelId === h.id);
    const hostelAllocations = allocations.filter((a) => a.hostelId === h.id && a.status === "active");
    return {
      ...h,
      warden: h.wardenStaffId ? staffById.get(h.wardenStaffId) : undefined,
      roomCount: hostelRooms.length,
      bedCount: hostelRooms.reduce((sum, r) => sum + r.capacity, 0),
      occupiedCount: hostelAllocations.length,
    };
  });
  return mockDelay(rows, 350);
}

/** Staff with designation "Warden" not already assigned to another hostel. */
export async function listEligibleWardenStaff(currentHostelId?: string): Promise<StaffMember[]> {
  await seedPromise;
  const staff = await listStaff();
  const assignedIds = new Set(hostels.filter((h) => h.id !== currentHostelId && h.wardenStaffId).map((h) => h.wardenStaffId));
  return mockDelay(staff.filter((s) => s.designation === "Warden" && !assignedIds.has(s.id)), 300);
}

export async function createHostel(values: HostelFormValues): Promise<Hostel> {
  await seedPromise;
  const hostel: Hostel = { id: genId("hostel"), ...values };
  hostels = [hostel, ...hostels];
  persistHostels();
  messMenu = [...messMenu, ...buildDefaultMessMenu(hostel.id).map((entry) => ({ id: genId("menu"), ...entry }))];
  persistMessMenu();
  return mockDelay(hostel, 350);
}

export async function updateHostel(id: string, values: HostelFormValues): Promise<Hostel> {
  await seedPromise;
  requireEntity(hostels, id, "Hostel");
  const updated: Hostel = { ...requireEntity(hostels, id, "Hostel"), ...values };
  hostels = hostels.map((h) => (h.id === id ? updated : h));
  persistHostels();
  return mockDelay(updated, 350);
}

export async function deleteHostel(id: string): Promise<void> {
  await seedPromise;
  requireEntity(hostels, id, "Hostel");
  if (allocations.some((a) => a.hostelId === id && a.status === "active")) {
    await mockDelay(null, 300);
    throw new Error("Vacate every student allocated to this hostel before deleting it");
  }
  hostels = hostels.filter((h) => h.id !== id);
  rooms = rooms.filter((r) => r.hostelId !== id);
  messMenu = messMenu.filter((m) => m.hostelId !== id);
  persistHostels();
  persistRooms();
  persistMessMenu();
  return mockDelay(undefined, 300);
}

// ── Rooms ────────────────────────────────────────────────────────────────

function occupiedBedsFor(roomId: string): number {
  return allocations.filter((a) => a.roomId === roomId && a.status === "active").length;
}

export async function listRooms(hostelId?: string): Promise<RoomRow[]> {
  await seedPromise;
  const result = (hostelId ? rooms.filter((r) => r.hostelId === hostelId) : [...rooms]).map((r) => ({
    ...r,
    occupiedBeds: occupiedBedsFor(r.id),
  }));
  return mockDelay(result, 300);
}

export async function addRoom(hostelId: string, values: RoomFormValues): Promise<Room> {
  await seedPromise;
  requireEntity(hostels, hostelId, "Hostel");
  if (rooms.some((r) => r.hostelId === hostelId && r.roomNumber.toLowerCase() === values.roomNumber.trim().toLowerCase())) {
    await mockDelay(null, 300);
    throw new Error("A room with this number already exists in this hostel");
  }
  const room: Room = { id: genId("room"), hostelId, ...values, roomNumber: values.roomNumber.trim() };
  rooms = [...rooms, room];
  persistRooms();
  return mockDelay(room, 350);
}

export async function updateRoom(id: string, values: RoomFormValues): Promise<Room> {
  await seedPromise;
  const existing = requireEntity(rooms, id, "Room");
  if (values.capacity < occupiedBedsFor(id)) {
    await mockDelay(null, 300);
    throw new Error("Capacity cannot be lower than the number of students currently allocated to this room");
  }
  const updated: Room = { ...existing, ...values, roomNumber: values.roomNumber.trim() };
  rooms = rooms.map((r) => (r.id === id ? updated : r));
  persistRooms();
  return mockDelay(updated, 350);
}

export async function deleteRoom(id: string): Promise<void> {
  await seedPromise;
  requireEntity(rooms, id, "Room");
  if (occupiedBedsFor(id) > 0) {
    await mockDelay(null, 300);
    throw new Error("Vacate every student in this room before deleting it");
  }
  rooms = rooms.filter((r) => r.id !== id);
  persistRooms();
  return mockDelay(undefined, 300);
}

// ── Allocations ──────────────────────────────────────────────────────────

function toAllocationRow(
  allocation: HostelAllocation,
  studentById: Map<string, Student>,
  hostelById: Map<string, Hostel>,
  roomById: Map<string, Room>,
): HostelAllocationRow | null {
  const student = studentById.get(allocation.studentId);
  const hostel = hostelById.get(allocation.hostelId);
  const room = roomById.get(allocation.roomId);
  if (!student || !hostel || !room) return null;
  return { ...allocation, student, hostel, room };
}

export async function listAllocations(): Promise<HostelAllocationRow[]> {
  await seedPromise;
  const students = await listStudents();
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const hostelById = new Map(hostels.map((h) => [h.id, h] as const));
  const roomById = new Map(rooms.map((r) => [r.id, r] as const));
  const rowsResult = allocations
    .map((a) => toAllocationRow(a, studentById, hostelById, roomById))
    .filter((r): r is HostelAllocationRow => r !== null);
  return mockDelay(rowsResult, 350);
}

export async function allocateStudent(values: AllocateStudentFormValues): Promise<HostelAllocation> {
  await seedPromise;
  const hostel = requireEntity(hostels, values.hostelId, "Hostel");
  if (hostel.status !== "active") {
    await mockDelay(null, 300);
    throw new Error("This hostel is inactive");
  }
  const room = requireEntity(rooms, values.roomId, "Room");
  if (room.hostelId !== values.hostelId) {
    await mockDelay(null, 300);
    throw new Error("The selected room does not belong to the selected hostel");
  }
  if (room.status !== "active") {
    await mockDelay(null, 300);
    throw new Error("This room is under maintenance");
  }
  if (allocations.some((a) => a.studentId === values.studentId && a.status === "active")) {
    await mockDelay(null, 300);
    throw new Error("This student already has an active hostel allocation");
  }
  const occupiedBedNumbers = new Set(allocations.filter((a) => a.roomId === room.id && a.status === "active").map((a) => a.bedNumber));
  if (occupiedBedNumbers.size >= room.capacity) {
    await mockDelay(null, 300);
    throw new Error("This room has no free beds");
  }
  let bedNumber = 1;
  while (occupiedBedNumbers.has(bedNumber)) bedNumber++;

  const allocation: HostelAllocation = {
    id: genId("hall"),
    studentId: values.studentId,
    hostelId: values.hostelId,
    roomId: values.roomId,
    bedNumber,
    monthlyFee: values.monthlyFee,
    allocatedOn: new Date().toISOString(),
    status: "active",
  };
  allocations = [allocation, ...allocations];
  persistAllocations();
  return mockDelay(allocation, 400);
}

export async function vacateAllocation(id: string): Promise<HostelAllocation> {
  await seedPromise;
  const existing = requireEntity(allocations, id, "Allocation");
  if (existing.status === "vacated") {
    await mockDelay(null, 300);
    throw new Error("This allocation has already been vacated");
  }
  const updated: HostelAllocation = { ...existing, status: "vacated", vacatedOn: new Date().toISOString() };
  allocations = allocations.map((a) => (a.id === id ? updated : a));
  persistAllocations();
  return mockDelay(updated, 350);
}

export async function deleteAllocation(id: string): Promise<void> {
  await seedPromise;
  requireEntity(allocations, id, "Allocation");
  allocations = allocations.filter((a) => a.id !== id);
  persistAllocations();
  return mockDelay(undefined, 300);
}

// ── Visitor register ─────────────────────────────────────────────────────

export async function listVisitorLogs(): Promise<VisitorLogRow[]> {
  await seedPromise;
  const students = await listStudents();
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const hostelById = new Map(hostels.map((h) => [h.id, h] as const));
  const rowsResult = visitorLogs
    .map((v) => {
      const student = studentById.get(v.studentId);
      const hostel = hostelById.get(v.hostelId);
      if (!student || !hostel) return null;
      return { ...v, student, hostel };
    })
    .filter((r): r is VisitorLogRow => r !== null);
  return mockDelay(rowsResult, 350);
}

export async function checkInVisitor(values: VisitorCheckInFormValues): Promise<VisitorLog> {
  await seedPromise;
  requireEntity(hostels, values.hostelId, "Hostel");
  const log: VisitorLog = { id: genId("visit"), ...values, checkInAt: new Date().toISOString(), status: "checked-in" };
  visitorLogs = [log, ...visitorLogs];
  persistVisitorLogs();
  return mockDelay(log, 400);
}

export async function checkOutVisitor(id: string): Promise<VisitorLog> {
  await seedPromise;
  const existing = requireEntity(visitorLogs, id, "Visitor log");
  if (existing.status === "checked-out") {
    await mockDelay(null, 300);
    throw new Error("This visitor has already checked out");
  }
  const updated: VisitorLog = { ...existing, status: "checked-out", checkOutAt: new Date().toISOString() };
  visitorLogs = visitorLogs.map((v) => (v.id === id ? updated : v));
  persistVisitorLogs();
  return mockDelay(updated, 300);
}

// ── Hostel attendance ────────────────────────────────────────────────────

export async function listActiveResidents(): Promise<HostelAllocationRow[]> {
  const all = await listAllocations();
  return all.filter((a) => a.status === "active");
}

export async function getHostelAttendanceForDate(date: string): Promise<HostelAttendanceRecord[]> {
  await seedPromise;
  return mockDelay(attendanceRecords.filter((r) => r.date === date), 300);
}

export async function saveHostelAttendance(date: string, entries: MarkHostelAttendanceEntry[]): Promise<void> {
  await seedPromise;
  const others = attendanceRecords.filter((r) => r.date !== date);
  const dayRecords: HostelAttendanceRecord[] = entries.map((e) => ({ id: genId("hatt"), date, studentId: e.studentId, status: e.status }));
  attendanceRecords = [...others, ...dayRecords];
  persistAttendance();
  return mockDelay(undefined, 400);
}

// ── Hostel fees ──────────────────────────────────────────────────────────

export async function listFeePayments(): Promise<HostelFeePaymentRow[]> {
  await seedPromise;
  const students = await listStudents();
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const hostelById = new Map(hostels.map((h) => [h.id, h] as const));
  const allocationById = new Map(allocations.map((a) => [a.id, a] as const));
  const rowsResult = feePayments
    .map((p) => {
      const allocation = allocationById.get(p.allocationId);
      const student = allocation ? studentById.get(allocation.studentId) : undefined;
      const hostel = allocation ? hostelById.get(allocation.hostelId) : undefined;
      if (!allocation || !student || !hostel) return null;
      return { ...p, allocation, student, hostel };
    })
    .filter((r): r is HostelFeePaymentRow => r !== null);
  return mockDelay(rowsResult, 350);
}

export async function generateFeePaymentsForMonth(month: string): Promise<number> {
  await seedPromise;
  const activeAllocations = allocations.filter((a) => a.status === "active" && a.monthlyFee);
  const existingKeys = new Set(feePayments.filter((p) => p.month === month).map((p) => p.allocationId));
  const newPayments: HostelFeePayment[] = activeAllocations
    .filter((a) => !existingKeys.has(a.id))
    .map((a) => ({ id: genId("hfee"), allocationId: a.id, month, amount: a.monthlyFee!, status: "pending" }));
  if (newPayments.length) {
    feePayments = [...newPayments, ...feePayments];
    persistFeePayments();
  }
  return mockDelay(newPayments.length, 400);
}

export async function markFeePaymentPaid(id: string): Promise<HostelFeePayment> {
  await seedPromise;
  const existing = requireEntity(feePayments, id, "Fee payment");
  if (existing.status === "paid") {
    await mockDelay(null, 300);
    throw new Error("This payment is already marked paid");
  }
  const updated: HostelFeePayment = { ...existing, status: "paid", paidOn: new Date().toISOString() };
  feePayments = feePayments.map((p) => (p.id === id ? updated : p));
  persistFeePayments();
  return mockDelay(updated, 300);
}

// ── Mess menu ────────────────────────────────────────────────────────────

export async function listMessMenu(hostelId: string): Promise<MessMenuEntry[]> {
  await seedPromise;
  return mockDelay(messMenu.filter((m) => m.hostelId === hostelId), 300);
}

export async function updateMessMenuEntry(id: string, items: string): Promise<MessMenuEntry> {
  await seedPromise;
  const existing = requireEntity(messMenu, id, "Menu entry");
  const updated: MessMenuEntry = { ...existing, items };
  messMenu = messMenu.map((m) => (m.id === id ? updated : m));
  persistMessMenu();
  return mockDelay(updated, 300);
}
