import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import { nextBadgeNumber } from "./constants";
import type { PreApprovedVisit, VisitorEntry, VisitPurpose, WatchlistEntry } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const HOUR_MS = 1000 * 60 * 60;
const daysAgo = (n: number, hourOfDay = 10) => {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(hourOfDay, 0, 0, 0);
  return d.toISOString();
};
const daysFromNow = (n: number, hourOfDay = 10) => {
  const d = new Date(Date.now() + n * DAY_MS);
  d.setHours(hourOfDay, 0, 0, 0);
  return d.toISOString();
};
const plusHours = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * HOUR_MS).toISOString();

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function findStaffByDesignation(staff: StaffMember[], designation: string): StaffMember | undefined {
  return staff.find((s) => s.designation === designation);
}

export function buildSeedVisitorData(
  students: Student[],
  staff: StaffMember[],
): { entries: VisitorEntry[]; preApprovals: PreApprovedVisit[]; watchlist: WatchlistEntry[] } {
  const activeStudents = students.filter((s) => s.status === "active");
  const principal = findStaffByDesignation(staff, "Principal") ?? staff[0];
  const accountant = findStaffByDesignation(staff, "Accountant") ?? staff[0];
  // No dedicated "Vice Principal" exists in every seeded roster — the Principal is the
  // next-sensible person to fall back to for an interview/meeting host, rather than an
  // arbitrary staff member whose designation wouldn't fit the visit's stated purpose.
  const vicePrincipal = findStaffByDesignation(staff, "Vice Principal") ?? principal;
  const teacher = findStaffByDesignation(staff, "Teacher") ?? staff[0];

  const entries: VisitorEntry[] = [];
  const badgeSeq: string[] = [];
  const addEntry = (
    daysBack: number,
    hourOfDay: number,
    visitDurationHours: number | null,
    visitorName: string,
    phone: string,
    purpose: VisitPurpose,
    host: Pick<VisitorEntry, "hostType" | "hostStudentId" | "hostStaffId" | "hostOtherLabel">,
    extra?: Partial<Pick<VisitorEntry, "idProofType" | "idProofNumber" | "purposeNotes">>,
  ) => {
    const checkInAt = daysAgo(daysBack, hourOfDay);
    const badgeNumber = nextBadgeNumber(badgeSeq);
    badgeSeq.push(badgeNumber);
    entries.push({
      id: genId("visit"),
      visitorName,
      phone,
      purpose,
      badgeNumber,
      checkInAt,
      checkOutAt: visitDurationHours === null ? undefined : plusHours(checkInAt, visitDurationHours),
      status: visitDurationHours === null ? "checked-in" : "checked-out",
      ...host,
      ...extra,
    });
  };

  addEntry(0, 9, null, "Rakesh Iyer", "+91 98450 91001", "meeting", { hostType: "staff", hostStaffId: principal?.id }, { idProofType: "Aadhaar", idProofNumber: "XXXX-XXXX-4821", purposeNotes: "Admission enquiry for younger sibling" });
  addEntry(0, 9.5, null, "BlueDart Courier", "+91 98450 91002", "delivery", { hostType: "other", hostOtherLabel: "Front Office" });
  addEntry(1, 11, 1.5, "Sunita Rao", "+91 98450 91003", "pickup", { hostType: "student", hostStudentId: activeStudents[0]?.id }, { purposeNotes: "Early pickup — dental appointment" });
  addEntry(2, 14, 1, "Vendor: EduTech Supplies", "+91 98450 91004", "meeting", { hostType: "staff", hostStaffId: accountant?.id }, { idProofType: "PAN Card", purposeNotes: "Quotation for lab equipment" });
  addEntry(3, 10, 0.75, "Anil Kapoor", "+91 98450 91005", "meeting", { hostType: "staff", hostStaffId: teacher?.id }, { purposeNotes: "Parent-teacher discussion" });
  addEntry(5, 13, 2, "Priya Sharma", "+91 98450 91006", "interview", { hostType: "staff", hostStaffId: vicePrincipal?.id }, { idProofType: "Driving License", purposeNotes: "Teaching position interview" });
  addEntry(6, 8.5, 0.5, "Ramesh Contractor", "+91 98450 91007", "maintenance", { hostType: "other", hostOtherLabel: "Facilities / Admin Block" }, { purposeNotes: "AC servicing" });
  addEntry(8, 16, 3, "Deepa Nair", "+91 98450 91008", "pickup", { hostType: "student", hostStudentId: activeStudents[1]?.id });
  addEntry(10, 9, 2, "Rotary Club Volunteers", "+91 98450 91009", "event", { hostType: "other", hostOtherLabel: "School Auditorium" }, { purposeNotes: "Annual day rehearsal coordination" });
  addEntry(12, 12, 1, "Sanjay Verma", "+91 98450 91010", "meeting", { hostType: "staff", hostStaffId: principal?.id }, { idProofType: "Aadhaar", purposeNotes: "Transfer certificate discussion" });

  const preApprovals: PreApprovedVisit[] = [
    {
      id: genId("preapp"),
      visitorName: "Meera Krishnan",
      phone: "+91 98450 92001",
      purpose: "meeting",
      purposeNotes: "Curriculum feedback session",
      hostType: "staff",
      hostStaffId: vicePrincipal?.id,
      scheduledAt: daysFromNow(2, 11),
      status: "scheduled",
    },
    {
      id: genId("preapp"),
      visitorName: "Aditya Bhandari",
      phone: "+91 98450 92002",
      purpose: "interview",
      purposeNotes: "Sports coach interview",
      hostType: "staff",
      hostStaffId: principal?.id,
      scheduledAt: daysFromNow(4, 14),
      status: "scheduled",
    },
    {
      id: genId("preapp"),
      visitorName: "Rakesh Iyer",
      phone: "+91 98450 91001",
      purpose: "meeting",
      purposeNotes: "Admission enquiry for younger sibling",
      hostType: "staff",
      hostStaffId: principal?.id,
      scheduledAt: daysAgo(0, 9),
      status: "arrived",
      visitorEntryId: entries[0]?.id,
    },
    {
      id: genId("preapp"),
      visitorName: "Nikhil Bose",
      phone: "+91 98450 92004",
      purpose: "meeting",
      purposeNotes: "Textbook vendor demo",
      hostType: "staff",
      hostStaffId: accountant?.id,
      scheduledAt: daysAgo(4, 15),
      status: "no-show",
    },
  ];

  const watchlist: WatchlistEntry[] = [
    { id: genId("watch"), name: "Vikas Oberoi", reason: "Repeated unauthorized entry attempts without checking in at front desk.", addedAt: daysAgo(45) },
    { id: genId("watch"), name: "Amanpreet Sandhu", phone: "+91 98450 00099", reason: "Restraining order on file — do not permit entry, notify administration immediately.", addedAt: daysAgo(90) },
  ];

  return { entries, preApprovals, watchlist };
}
