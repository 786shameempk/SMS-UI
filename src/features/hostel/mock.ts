import { DEFAULT_TENANT_ID, defaultBranchIdForTenant } from "@/utils/tenant";
import type { StaffFormValues } from "@/features/staff/types";
import type { DayOfWeek, MealType, Room } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const yearsAgo = (n: number) => new Date(Date.now() - n * DAY_MS * 365).toISOString();
const DEFAULT_BRANCH_ID = defaultBranchIdForTenant(DEFAULT_TENANT_ID);

/**
 * The generic staff seed ships no "Warden" designated records. These are created through
 * staff's own createStaff() API (see performSeed in api.ts) rather than by editing
 * staff/mock.ts, same convention as EXTRA_DRIVER_SEEDS in the transport module.
 */
const EXTRA_WARDEN_SEED_BASE: Omit<StaffFormValues, "branchId">[] = [
  {
    firstName: "Geeta",
    lastName: "Krishnan",
    dateOfBirth: yearsAgo(48),
    gender: "female",
    designation: "Warden",
    department: "Hostel",
    phone: "+91 98450 77001",
    email: "geeta.krishnan@educore.dev",
    address: "Hostel Campus, Block A",
  },
  {
    firstName: "Vikram",
    lastName: "Rao",
    dateOfBirth: yearsAgo(52),
    gender: "male",
    designation: "Warden",
    department: "Hostel",
    phone: "+91 98450 77002",
    email: "vikram.rao@educore.dev",
    address: "Hostel Campus, Block B",
  },
];

export const EXTRA_WARDEN_SEEDS: StaffFormValues[] = EXTRA_WARDEN_SEED_BASE.map((s) => ({ ...s, branchId: DEFAULT_BRANCH_ID }));

interface HostelSeed {
  id: string;
  name: string;
  type: "boys" | "girls" | "co-ed";
  wardenEmail?: string;
  address: string;
  status: "active" | "inactive";
  rooms: Array<Omit<Room, "id" | "tenantId" | "branchId" | "hostelId">>;
}

export const HOSTEL_PLAN: HostelSeed[] = [
  {
    id: "hostel-1",
    name: "Sunrise Boys Hostel",
    type: "boys",
    wardenEmail: "vikram.rao@educore.dev",
    address: "Block A, School Campus",
    status: "active",
    rooms: [
      { roomNumber: "G-101", floor: "Ground", capacity: 4, roomType: "dormitory", status: "active" },
      { roomNumber: "1-101", floor: "1st Floor", capacity: 2, roomType: "double", status: "active" },
      { roomNumber: "1-102", floor: "1st Floor", capacity: 1, roomType: "single", status: "active" },
      { roomNumber: "2-101", floor: "2nd Floor", capacity: 3, roomType: "triple", status: "maintenance" },
    ],
  },
  {
    id: "hostel-2",
    name: "Moonlight Girls Hostel",
    type: "girls",
    wardenEmail: "geeta.krishnan@educore.dev",
    address: "Block B, School Campus",
    status: "active",
    rooms: [
      { roomNumber: "G-201", floor: "Ground", capacity: 4, roomType: "dormitory", status: "active" },
      { roomNumber: "1-201", floor: "1st Floor", capacity: 2, roomType: "double", status: "active" },
      { roomNumber: "1-202", floor: "1st Floor", capacity: 2, roomType: "double", status: "active" },
      { roomNumber: "1-203", floor: "1st Floor", capacity: 1, roomType: "single", status: "active" },
    ],
  },
  {
    id: "hostel-3",
    name: "Annex Hostel",
    type: "co-ed",
    address: "Off-campus Annex, 2km from school",
    status: "inactive",
    rooms: [{ roomNumber: "A-01", floor: "Ground", capacity: 2, roomType: "double", status: "active" }],
  },
];

const BREAKFAST_ROTATION = ["Idli & sambar", "Poha & tea", "Aloo paratha & curd", "Upma & chutney", "Bread omelette & milk", "Dosa & chutney", "Cornflakes & fruit"];
const LUNCH_ROTATION = ["Rice, dal, mixed veg", "Chapati, rajma, salad", "Curd rice, pickle", "Rice, sambar, poriyal", "Chapati, chana masala", "Veg biryani, raita", "Rice, dal, papad"];
const SNACKS_ROTATION = ["Samosa & tea", "Fruit chaat", "Bread pakora", "Sprouts chaat", "Biscuits & milk", "Vada pav", "Cutlet & sauce"];
const DINNER_ROTATION = ["Chapati, paneer curry", "Rice, dal, veg fry", "Fried rice, gobi manchurian", "Chapati, egg curry / veg kurma", "Khichdi, papad", "Chapati, dal makhani", "Pulao, raita"];

const ROTATIONS: Record<MealType, string[]> = {
  breakfast: BREAKFAST_ROTATION,
  lunch: LUNCH_ROTATION,
  snacks: SNACKS_ROTATION,
  dinner: DINNER_ROTATION,
};

const DAY_ORDER: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function buildDefaultMessMenu(hostelId: string): Array<{ hostelId: string; day: DayOfWeek; meal: MealType; items: string }> {
  const entries: Array<{ hostelId: string; day: DayOfWeek; meal: MealType; items: string }> = [];
  DAY_ORDER.forEach((day, dayIndex) => {
    (Object.keys(ROTATIONS) as MealType[]).forEach((meal) => {
      const rotation = ROTATIONS[meal];
      entries.push({ hostelId, day, meal, items: rotation[dayIndex % rotation.length] });
    });
  });
  return entries;
}
