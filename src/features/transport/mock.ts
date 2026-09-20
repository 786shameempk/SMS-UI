import { DEFAULT_TENANT_ID, defaultBranchIdForTenant } from "@/utils/tenant";
import type { StaffFormValues } from "@/features/staff/types";
import type { Bus, RouteStatus } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const yearsAgo = (n: number) => new Date(Date.now() - n * DAY_MS * 365).toISOString();
const yearsFromNow = (n: number) => new Date(Date.now() + n * DAY_MS * 365).toISOString();
const DEFAULT_BRANCH_ID = defaultBranchIdForTenant(DEFAULT_TENANT_ID);

/**
 * The generic staff seed only ships one "Driver" designated record (Suresh Patil / stf-6).
 * These extra drivers are created through staff's own createStaff() API (see performSeed in
 * api.ts) rather than by editing staff/mock.ts, so the staff module stays untouched — same
 * convention the teachers module uses for EXTRA_TEACHER_SEEDS.
 */
const EXTRA_DRIVER_SEED_BASE: Omit<StaffFormValues, "branchId">[] = [
  {
    firstName: "Manoj",
    lastName: "Kumar",
    dateOfBirth: yearsAgo(39),
    gender: "male",
    designation: "Driver",
    department: "Transport",
    phone: "+91 98450 99112",
    email: "manoj.kumar@educore.dev",
    address: "22 Rajajinagar, Bengaluru",
  },
  {
    firstName: "Ravi",
    lastName: "Shankar",
    dateOfBirth: yearsAgo(45),
    gender: "male",
    designation: "Driver",
    department: "Transport",
    phone: "+91 98450 99223",
    email: "ravi.shankar@educore.dev",
    address: "8 Malleshwaram, Bengaluru",
  },
  {
    firstName: "Farida",
    lastName: "Sheikh",
    dateOfBirth: yearsAgo(34),
    gender: "female",
    designation: "Driver",
    department: "Transport",
    phone: "+91 98450 99334",
    email: "farida.sheikh@educore.dev",
    address: "5 Frazer Town, Bengaluru",
  },
  {
    firstName: "Basavaraj",
    lastName: "Hosamani",
    dateOfBirth: yearsAgo(50),
    gender: "male",
    designation: "Driver",
    department: "Transport",
    phone: "+91 98450 99445",
    email: "basavaraj.h@educore.dev",
    address: "31 Vijayanagar, Bengaluru",
  },
];

export const EXTRA_DRIVER_SEEDS: StaffFormValues[] = EXTRA_DRIVER_SEED_BASE.map((s) => ({ ...s, branchId: DEFAULT_BRANCH_ID }));

interface DriverLicenseSeed {
  driverEmail: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  experienceYears: number;
}

/** stf-6 (Suresh Patil) is the one pre-existing seeded driver. */
export const DRIVER_LICENSE_PLAN: DriverLicenseSeed[] = [
  { driverEmail: "suresh.patil@educore.dev", licenseNumber: "KA-05-2019-0044211", licenseExpiryDate: yearsFromNow(2), experienceYears: 12 },
  { driverEmail: "manoj.kumar@educore.dev", licenseNumber: "KA-03-2021-0078833", licenseExpiryDate: yearsFromNow(3), experienceYears: 9 },
  { driverEmail: "ravi.shankar@educore.dev", licenseNumber: "KA-01-2016-0012987", licenseExpiryDate: yearsFromNow(1), experienceYears: 18 },
  { driverEmail: "farida.sheikh@educore.dev", licenseNumber: "KA-05-2022-0091120", licenseExpiryDate: yearsFromNow(4), experienceYears: 6 },
  { driverEmail: "basavaraj.h@educore.dev", licenseNumber: "KA-02-2014-0005574", licenseExpiryDate: yearsFromNow(1), experienceYears: 21 },
];

export const SEED_BUSES: Omit<Bus, "tenantId" | "branchId">[] = [
  { id: "bus-1", regNumber: "KA-05-AB-1234", model: "Tata Starbus 40-seater", capacity: 40, manufactureYear: 2021, gpsDeviceId: "GPS-TRK-1001", status: "active" },
  { id: "bus-2", regNumber: "KA-05-AB-5678", model: "Ashok Leyland 32-seater", capacity: 32, manufactureYear: 2019, gpsDeviceId: "GPS-TRK-1002", status: "active" },
  { id: "bus-3", regNumber: "KA-05-AC-2468", model: "Force Traveller 26-seater", capacity: 26, manufactureYear: 2022, gpsDeviceId: "GPS-TRK-1003", status: "active" },
  { id: "bus-4", regNumber: "KA-05-AC-1357", model: "Tata Starbus 40-seater", capacity: 40, manufactureYear: 2018, gpsDeviceId: "GPS-TRK-1004", status: "maintenance" },
  { id: "bus-5", regNumber: "KA-05-AD-9911", model: "Eicher Skyline 36-seater", capacity: 36, manufactureYear: 2023, status: "inactive" },
];

interface StopSeed {
  name: string;
  arrivalTime: string;
  landmark?: string;
}

interface RouteSeed {
  id: string;
  name: string;
  busId: string;
  driverEmail: string;
  startTime: string;
  endTime: string;
  status: RouteStatus;
  stops: StopSeed[];
}

export const ROUTE_PLAN: RouteSeed[] = [
  {
    id: "rt-1",
    name: "Route 1 — Jayanagar / JP Nagar",
    busId: "bus-1",
    driverEmail: "suresh.patil@educore.dev",
    startTime: "06:45",
    endTime: "07:45",
    status: "active",
    stops: [
      { name: "Jayanagar 4th Block", arrivalTime: "06:45", landmark: "Near BDA Complex" },
      { name: "Jayanagar 9th Block", arrivalTime: "06:55" },
      { name: "JP Nagar 3rd Phase", arrivalTime: "07:10", landmark: "Opposite Meenakshi Mall" },
      { name: "JP Nagar 7th Phase", arrivalTime: "07:25" },
      { name: "School Campus", arrivalTime: "07:45" },
    ],
  },
  {
    id: "rt-2",
    name: "Route 2 — Koramangala / HSR Layout",
    busId: "bus-2",
    driverEmail: "manoj.kumar@educore.dev",
    startTime: "06:50",
    endTime: "07:50",
    status: "active",
    stops: [
      { name: "Koramangala 4th Block", arrivalTime: "06:50" },
      { name: "Koramangala 7th Block", arrivalTime: "07:00", landmark: "Near Sony World Signal" },
      { name: "HSR Layout Sector 2", arrivalTime: "07:20" },
      { name: "HSR Layout Sector 6", arrivalTime: "07:35" },
      { name: "School Campus", arrivalTime: "07:50" },
    ],
  },
  {
    id: "rt-3",
    name: "Route 3 — Malleshwaram / Rajajinagar",
    busId: "bus-3",
    driverEmail: "ravi.shankar@educore.dev",
    startTime: "06:40",
    endTime: "07:40",
    status: "active",
    stops: [
      { name: "Malleshwaram 8th Cross", arrivalTime: "06:40" },
      { name: "Rajajinagar 1st Block", arrivalTime: "06:58", landmark: "Near ESI Hospital" },
      { name: "Rajajinagar 5th Block", arrivalTime: "07:12" },
      { name: "School Campus", arrivalTime: "07:40" },
    ],
  },
  {
    id: "rt-4",
    name: "Route 4 — Whitefield / Marathahalli",
    busId: "bus-4",
    driverEmail: "farida.sheikh@educore.dev",
    startTime: "06:20",
    endTime: "07:55",
    status: "inactive",
    stops: [
      { name: "Whitefield Main Road", arrivalTime: "06:20" },
      { name: "ITPL Gate", arrivalTime: "06:40" },
      { name: "Marathahalli Bridge", arrivalTime: "07:10", landmark: "Near Innovative Multiplex" },
      { name: "School Campus", arrivalTime: "07:55" },
    ],
  },
];
