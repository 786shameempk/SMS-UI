import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type {
  AllocateStudentFormValues,
  AllocationStatus,
  DayOfWeek,
  Hostel,
  HostelAllocation,
  HostelAllocationRow,
  HostelAttendanceRecord,
  HostelAttendanceStatus,
  HostelFeePayment,
  HostelFeePaymentRow,
  HostelFeePaymentStatus,
  HostelFormValues,
  HostelRow,
  HostelStatus,
  HostelType,
  MarkHostelAttendanceEntry,
  MealType,
  MessMenuEntry,
  Room,
  RoomFormValues,
  RoomRow,
  RoomStatus,
  RoomType,
  VisitorCheckInFormValues,
  VisitorLog,
  VisitorLogRow,
  VisitorStatus,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// CampusService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase/kebab-case unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const HOSTEL_TYPE_TO_API: Record<HostelType, string> = { boys: "Boys", girls: "Girls", "co-ed": "CoEd" };
const HOSTEL_TYPE_FROM_API: Record<string, HostelType> = { Boys: "boys", Girls: "girls", CoEd: "co-ed" };

const HOSTEL_STATUS_TO_API: Record<HostelStatus, string> = { active: "Active", inactive: "Inactive" };
const HOSTEL_STATUS_FROM_API: Record<string, HostelStatus> = { Active: "active", Inactive: "inactive" };

const ROOM_TYPE_TO_API: Record<RoomType, string> = { single: "Single", double: "Double", triple: "Triple", dormitory: "Dormitory" };
const ROOM_TYPE_FROM_API: Record<string, RoomType> = { Single: "single", Double: "double", Triple: "triple", Dormitory: "dormitory" };

const ROOM_STATUS_TO_API: Record<RoomStatus, string> = { active: "Active", maintenance: "Maintenance" };
const ROOM_STATUS_FROM_API: Record<string, RoomStatus> = { Active: "active", Maintenance: "maintenance" };

const ALLOCATION_STATUS_FROM_API: Record<string, AllocationStatus> = { Active: "active", Vacated: "vacated" };

const VISITOR_STATUS_FROM_API: Record<string, VisitorStatus> = { CheckedIn: "checked-in", CheckedOut: "checked-out" };

const ATTENDANCE_STATUS_TO_API: Record<HostelAttendanceStatus, string> = { present: "Present", absent: "Absent", "on-leave": "OnLeave" };
const ATTENDANCE_STATUS_FROM_API: Record<string, HostelAttendanceStatus> = { Present: "present", Absent: "absent", OnLeave: "on-leave" };

const FEE_STATUS_FROM_API: Record<string, HostelFeePaymentStatus> = { Pending: "pending", Paid: "paid" };

const DAY_FROM_API: Record<string, DayOfWeek> = {
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
  Sunday: "sunday",
};

const MEAL_FROM_API: Record<string, MealType> = { Breakfast: "breakfast", Lunch: "lunch", Snacks: "snacks", Dinner: "dinner" };

// ── API response shapes (CampusService DTOs) ────────────────────────────────

interface ApiHostel {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  type: string;
  wardenStaffId: string | null;
  address: string | null;
  status: string;
}

interface ApiRoom {
  id: string;
  tenantId: string;
  branchId: string;
  hostelId: string;
  roomNumber: string;
  floor: string;
  capacity: number;
  roomType: string;
  status: string;
  occupiedBeds: number;
}

interface ApiHostelAllocation {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  hostelId: string;
  roomId: string;
  bedNumber: number;
  monthlyFee: number | null;
  allocatedOn: string;
  vacatedOn: string | null;
  status: string;
}

interface ApiVisitorLog {
  id: string;
  tenantId: string;
  branchId: string;
  hostelId: string;
  studentId: string;
  visitorName: string;
  relation: string;
  phone: string;
  purpose: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  status: string;
}

interface ApiHostelAttendanceRecord {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  date: string;
  status: string;
}

interface ApiHostelFeePayment {
  id: string;
  tenantId: string;
  branchId: string;
  allocationId: string;
  month: string;
  amount: number;
  status: string;
  paidOn: string | null;
}

interface ApiMessMenuEntry {
  id: string;
  tenantId: string;
  branchId: string;
  hostelId: string;
  day: string;
  meal: string;
  items: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapHostel(dto: ApiHostel): Hostel {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    name: dto.name,
    type: HOSTEL_TYPE_FROM_API[dto.type] ?? "boys",
    wardenStaffId: dto.wardenStaffId ?? undefined,
    address: dto.address ?? undefined,
    status: HOSTEL_STATUS_FROM_API[dto.status] ?? "active",
  };
}

function mapRoom(dto: ApiRoom): RoomRow {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    hostelId: dto.hostelId,
    roomNumber: dto.roomNumber,
    floor: dto.floor,
    capacity: dto.capacity,
    roomType: ROOM_TYPE_FROM_API[dto.roomType] ?? "double",
    status: ROOM_STATUS_FROM_API[dto.status] ?? "active",
    occupiedBeds: dto.occupiedBeds,
  };
}

/** Strips the RoomRow-only occupiedBeds field so mutation results match the plain Room type. */
function toRoom({ occupiedBeds: _occupiedBeds, ...room }: RoomRow): Room {
  return room;
}

function mapAllocation(dto: ApiHostelAllocation): HostelAllocation {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    studentId: dto.studentId,
    hostelId: dto.hostelId,
    roomId: dto.roomId,
    bedNumber: dto.bedNumber,
    monthlyFee: dto.monthlyFee ?? undefined,
    allocatedOn: dto.allocatedOn,
    vacatedOn: dto.vacatedOn ?? undefined,
    status: ALLOCATION_STATUS_FROM_API[dto.status] ?? "active",
  };
}

function mapVisitorLog(dto: ApiVisitorLog): VisitorLog {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    hostelId: dto.hostelId,
    studentId: dto.studentId,
    visitorName: dto.visitorName,
    relation: dto.relation,
    phone: dto.phone,
    purpose: dto.purpose ?? undefined,
    checkInAt: dto.checkInAt,
    checkOutAt: dto.checkOutAt ?? undefined,
    status: VISITOR_STATUS_FROM_API[dto.status] ?? "checked-in",
  };
}

function mapAttendanceRecord(dto: ApiHostelAttendanceRecord): HostelAttendanceRecord {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    studentId: dto.studentId,
    date: dto.date,
    status: ATTENDANCE_STATUS_FROM_API[dto.status] ?? "present",
  };
}

function mapFeePayment(dto: ApiHostelFeePayment): HostelFeePayment {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    allocationId: dto.allocationId,
    month: dto.month,
    amount: dto.amount,
    status: FEE_STATUS_FROM_API[dto.status] ?? "pending",
    paidOn: dto.paidOn ?? undefined,
  };
}

function mapMessMenuEntry(dto: ApiMessMenuEntry): MessMenuEntry {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    hostelId: dto.hostelId,
    day: DAY_FROM_API[dto.day] ?? "monday",
    meal: MEAL_FROM_API[dto.meal] ?? "breakfast",
    items: dto.items,
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

async function fetchHostels(): Promise<Hostel[]> {
  const hostels = await unwrap(campusHttpClient.get<ApiHostel[]>("/api/hostels"));
  return hostels.map(mapHostel);
}

async function fetchAllocations(): Promise<HostelAllocation[]> {
  const allocations = await unwrap(campusHttpClient.get<ApiHostelAllocation[]>("/api/hostelallocations"));
  return allocations.map(mapAllocation);
}

function hostelPayload(values: HostelFormValues) {
  return {
    name: values.name,
    type: HOSTEL_TYPE_TO_API[values.type],
    wardenStaffId: values.wardenStaffId || null,
    address: values.address?.trim() || null,
    status: HOSTEL_STATUS_TO_API[values.status],
  };
}

function roomPayload(values: RoomFormValues) {
  return {
    roomNumber: values.roomNumber.trim(),
    floor: values.floor,
    capacity: values.capacity,
    roomType: ROOM_TYPE_TO_API[values.roomType],
    status: ROOM_STATUS_TO_API[values.status],
  };
}

// ── Hostels ──────────────────────────────────────────────────────────────

/**
 * HostelDto carries no warden/room/occupancy data (WardenStaffId is a soft reference into
 * AcademicService's Staff), so the HostelRow shape is composed here from the Rooms and
 * Allocations lists plus staff/api.ts - same bridging convention as transport/api.ts's listDrivers.
 */
export async function listHostels(): Promise<HostelRow[]> {
  const [hostels, rooms, allocations, staff] = await Promise.all([fetchHostels(), listRooms(), fetchAllocations(), listStaff()]);
  const staffById = new Map(staff.map((s) => [s.id, s] as const));
  return hostels.map((h) => {
    const hostelRooms = rooms.filter((r) => r.hostelId === h.id);
    return {
      ...h,
      warden: h.wardenStaffId ? staffById.get(h.wardenStaffId) : undefined,
      roomCount: hostelRooms.length,
      bedCount: hostelRooms.reduce((sum, r) => sum + r.capacity, 0),
      occupiedCount: allocations.filter((a) => a.hostelId === h.id && a.status === "active").length,
    };
  });
}

/** Staff with designation "Warden" not already assigned to another hostel - pure frontend composition. */
export async function listEligibleWardenStaff(currentHostelId?: string): Promise<StaffMember[]> {
  const [hostels, staff] = await Promise.all([fetchHostels(), listStaff()]);
  const assignedIds = new Set(hostels.filter((h) => h.id !== currentHostelId && h.wardenStaffId).map((h) => h.wardenStaffId));
  return staff.filter((s) => s.designation === "Warden" && !assignedIds.has(s.id));
}

export async function createHostel(values: HostelFormValues): Promise<Hostel> {
  const dto = await unwrap(campusHttpClient.post<ApiHostel>("/api/hostels", hostelPayload(values)));
  return mapHostel(dto);
}

export async function updateHostel(id: string, values: HostelFormValues): Promise<Hostel> {
  const dto = await unwrap(campusHttpClient.put<ApiHostel>(`/api/hostels/${id}`, hostelPayload(values)));
  return mapHostel(dto);
}

export async function deleteHostel(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/hostels/${id}`));
}

// ── Rooms ────────────────────────────────────────────────────────────────

export async function listRooms(hostelId?: string): Promise<RoomRow[]> {
  const rooms = await unwrap(campusHttpClient.get<ApiRoom[]>("/api/rooms", { params: hostelId ? { hostelId } : undefined }));
  return rooms.map(mapRoom);
}

export async function addRoom(hostelId: string, values: RoomFormValues): Promise<Room> {
  const dto = await unwrap(campusHttpClient.post<ApiRoom>("/api/rooms", { hostelId, ...roomPayload(values) }));
  return toRoom(mapRoom(dto));
}

export async function updateRoom(id: string, values: RoomFormValues): Promise<Room> {
  const dto = await unwrap(campusHttpClient.put<ApiRoom>(`/api/rooms/${id}`, roomPayload(values)));
  return toRoom(mapRoom(dto));
}

export async function deleteRoom(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/rooms/${id}`));
}

// ── Allocations ──────────────────────────────────────────────────────────

/** Rows whose student/hostel/room no longer resolves are dropped, matching the mock. */
export async function listAllocations(): Promise<HostelAllocationRow[]> {
  const [allocations, students, hostels, rooms] = await Promise.all([fetchAllocations(), listStudents(), fetchHostels(), listRooms()]);
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const hostelById = new Map(hostels.map((h) => [h.id, h] as const));
  const roomById = new Map(rooms.map((r) => [r.id, toRoom(r)] as const));
  return allocations
    .map((a) => {
      const student = studentById.get(a.studentId);
      const hostel = hostelById.get(a.hostelId);
      const room = roomById.get(a.roomId);
      if (!student || !hostel || !room) return null;
      return { ...a, student, hostel, room };
    })
    .filter((r): r is HostelAllocationRow => r !== null);
}

export async function allocateStudent(values: AllocateStudentFormValues): Promise<HostelAllocation> {
  const dto = await unwrap(
    campusHttpClient.post<ApiHostelAllocation>("/api/hostelallocations", {
      studentId: values.studentId,
      hostelId: values.hostelId,
      roomId: values.roomId,
      monthlyFee: values.monthlyFee ?? null,
    }),
  );
  return mapAllocation(dto);
}

export async function vacateAllocation(id: string): Promise<HostelAllocation> {
  const dto = await unwrap(campusHttpClient.post<ApiHostelAllocation>(`/api/hostelallocations/${id}/vacate`));
  return mapAllocation(dto);
}

export async function deleteAllocation(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/hostelallocations/${id}`));
}

// ── Visitor register ─────────────────────────────────────────────────────

export async function listVisitorLogs(): Promise<VisitorLogRow[]> {
  const [logs, students, hostels] = await Promise.all([
    unwrap(campusHttpClient.get<ApiVisitorLog[]>("/api/visitorlogs")),
    listStudents(),
    fetchHostels(),
  ]);
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const hostelById = new Map(hostels.map((h) => [h.id, h] as const));
  return logs
    .map(mapVisitorLog)
    .map((v) => {
      const student = studentById.get(v.studentId);
      const hostel = hostelById.get(v.hostelId);
      if (!student || !hostel) return null;
      return { ...v, student, hostel };
    })
    .filter((r): r is VisitorLogRow => r !== null);
}

export async function checkInVisitor(values: VisitorCheckInFormValues): Promise<VisitorLog> {
  const dto = await unwrap(
    campusHttpClient.post<ApiVisitorLog>("/api/visitorlogs", {
      hostelId: values.hostelId,
      studentId: values.studentId,
      visitorName: values.visitorName,
      relation: values.relation,
      phone: values.phone,
      purpose: values.purpose?.trim() || null,
    }),
  );
  return mapVisitorLog(dto);
}

export async function checkOutVisitor(id: string): Promise<VisitorLog> {
  const dto = await unwrap(campusHttpClient.post<ApiVisitorLog>(`/api/visitorlogs/${id}/check-out`));
  return mapVisitorLog(dto);
}

// ── Hostel attendance ────────────────────────────────────────────────────

export async function listActiveResidents(): Promise<HostelAllocationRow[]> {
  const all = await listAllocations();
  return all.filter((a) => a.status === "active");
}

export async function getHostelAttendanceForDate(date: string): Promise<HostelAttendanceRecord[]> {
  const records = await unwrap(campusHttpClient.get<ApiHostelAttendanceRecord[]>("/api/hostelattendance", { params: { date } }));
  return records.map(mapAttendanceRecord);
}

export async function saveHostelAttendance(date: string, entries: MarkHostelAttendanceEntry[]): Promise<void> {
  await unwrap(
    campusHttpClient.put("/api/hostelattendance", {
      date,
      entries: entries.map((e) => ({ studentId: e.studentId, status: ATTENDANCE_STATUS_TO_API[e.status] })),
    }),
  );
}

// ── Hostel fees ──────────────────────────────────────────────────────────

export async function listFeePayments(): Promise<HostelFeePaymentRow[]> {
  const [payments, allocations, students, hostels] = await Promise.all([
    unwrap(campusHttpClient.get<ApiHostelFeePayment[]>("/api/hostelfeepayments")),
    fetchAllocations(),
    listStudents(),
    fetchHostels(),
  ]);
  const allocationById = new Map(allocations.map((a) => [a.id, a] as const));
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const hostelById = new Map(hostels.map((h) => [h.id, h] as const));
  return payments
    .map(mapFeePayment)
    .map((p) => {
      const allocation = allocationById.get(p.allocationId);
      const student = allocation ? studentById.get(allocation.studentId) : undefined;
      const hostel = allocation ? hostelById.get(allocation.hostelId) : undefined;
      if (!allocation || !student || !hostel) return null;
      return { ...p, allocation, student, hostel };
    })
    .filter((r): r is HostelFeePaymentRow => r !== null);
}

export async function generateFeePaymentsForMonth(month: string): Promise<number> {
  const result = await unwrap(campusHttpClient.post<{ createdCount: number }>("/api/hostelfeepayments/generate", { month }));
  return result.createdCount;
}

export async function markFeePaymentPaid(id: string): Promise<HostelFeePayment> {
  const dto = await unwrap(campusHttpClient.post<ApiHostelFeePayment>(`/api/hostelfeepayments/${id}/mark-paid`));
  return mapFeePayment(dto);
}

// ── Mess menu ────────────────────────────────────────────────────────────

export async function listMessMenu(hostelId: string): Promise<MessMenuEntry[]> {
  const entries = await unwrap(campusHttpClient.get<ApiMessMenuEntry[]>("/api/messmenu", { params: { hostelId } }));
  return entries.map(mapMessMenuEntry);
}

export async function updateMessMenuEntry(id: string, items: string): Promise<MessMenuEntry> {
  const dto = await unwrap(campusHttpClient.put<ApiMessMenuEntry>(`/api/messmenu/${id}`, { items }));
  return mapMessMenuEntry(dto);
}
