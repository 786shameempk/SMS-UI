import type { StaffFormValues, StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import { nextTicketNumber } from "./constants";
import type { Ticket, TicketCategory, TicketComment, TicketPriority, TicketStatus } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const HOUR_MS = 1000 * 60 * 60;
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR_MS).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

/**
 * "IT Support" is already a valid `StaffDesignation`, but the generic staff seed ships no one
 * holding it. Created through staff's own createStaff() API (see performSeed in api.ts), same
 * convention as EXTRA_NURSE_SEEDS in the health module and EXTRA_WARDEN_SEEDS in hostel.
 */
export const EXTRA_IT_SUPPORT_SEEDS: StaffFormValues[] = [
  {
    firstName: "Arvind",
    lastName: "Menon",
    dateOfBirth: new Date(Date.now() - 31 * 365 * DAY_MS).toISOString(),
    gender: "male",
    designation: "IT Support",
    department: "IT",
    phone: "+91 98450 93001",
    email: "arvind.menon@educore.dev",
    address: "IT Office, Admin Block",
  },
];

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function findStaffByDesignation(staff: StaffMember[], designation: string): StaffMember | undefined {
  return staff.find((s) => s.designation === designation);
}

interface TicketSeed {
  daysBack: number;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  raisedBy:
    | { raisedByType: "student"; studentIndex: number }
    | { raisedByType: "staff"; staffMember: StaffMember | undefined }
    | { raisedByType: "parent"; raisedByName: string; raisedByContact: string; studentIndex?: number };
  assignedTo?: StaffMember;
  resolutionNotes?: string;
  comments?: Array<{ hoursAfterCreation: number; message: string; authorStaffId?: string; authorLabel: string; visibleToSubmitter: boolean }>;
  resolvedHoursAfterCreation?: number;
}

export function buildSeedTickets(students: Student[], staff: StaffMember[]): Ticket[] {
  const activeStudents = students.filter((s) => s.status === "active");
  const principal = findStaffByDesignation(staff, "Principal");
  const accountant = findStaffByDesignation(staff, "Accountant");
  const librarian = findStaffByDesignation(staff, "Librarian");
  const security = findStaffByDesignation(staff, "Security");
  const warden = findStaffByDesignation(staff, "Warden");
  const teacher = findStaffByDesignation(staff, "Teacher");
  const itSupport = findStaffByDesignation(staff, "IT Support");

  const seeds: TicketSeed[] = [
    {
      daysBack: 20,
      category: "it_support",
      priority: "medium",
      status: "resolved",
      subject: "Projector not working in Room 204",
      description: "The ceiling projector shows no signal even after restarting. Affects Grade 9 science classes.",
      raisedBy: { raisedByType: "staff", staffMember: teacher },
      assignedTo: itSupport,
      resolutionNotes: "Replaced the HDMI cable and updated the projector firmware. Confirmed working with the teacher.",
      resolvedHoursAfterCreation: 30,
      comments: [
        { hoursAfterCreation: 2, message: "Checked the cable — looks loose, ordering a replacement.", authorStaffId: itSupport?.id, authorLabel: itSupport ? `${itSupport.firstName} ${itSupport.lastName}` : "IT Support", visibleToSubmitter: true },
        { hoursAfterCreation: 29, message: "Replacement cable installed, tested with a laptop — working fine now.", authorStaffId: itSupport?.id, authorLabel: itSupport ? `${itSupport.firstName} ${itSupport.lastName}` : "IT Support", visibleToSubmitter: true },
      ],
    },
    {
      daysBack: 3,
      category: "it_support",
      priority: "high",
      status: "in_progress",
      subject: "Student portal login failing for several parents",
      description: "Multiple parents report 'invalid credentials' even after a password reset. Seems intermittent.",
      raisedBy: { raisedByType: "staff", staffMember: principal },
      assignedTo: itSupport,
      comments: [
        { hoursAfterCreation: 4, message: "Reproduced the issue — looks like a session token expiry bug. Investigating with the vendor.", authorStaffId: itSupport?.id, authorLabel: itSupport ? `${itSupport.firstName} ${itSupport.lastName}` : "IT Support", visibleToSubmitter: true },
      ],
    },
    {
      daysBack: 1,
      category: "facilities",
      priority: "medium",
      status: "open",
      subject: "Leaking tap in Grade 5 washroom",
      description: "The washroom near the Grade 5 wing has a tap that won't fully shut off, water pooling on the floor.",
      raisedBy: { raisedByType: "student", studentIndex: 2 },
    },
    {
      daysBack: 15,
      category: "facilities",
      priority: "low",
      status: "resolved",
      subject: "AC not cooling in Library",
      description: "The library's main AC unit is running but not cooling effectively, especially in the afternoon.",
      raisedBy: { raisedByType: "staff", staffMember: librarian },
      assignedTo: accountant,
      resolutionNotes: "Facilities vendor serviced the unit and topped up refrigerant. Confirmed cooling normally.",
      resolvedHoursAfterCreation: 48,
    },
    {
      daysBack: 5,
      category: "transport",
      priority: "high",
      status: "open",
      subject: "Bus Route 3 consistently 20 minutes late",
      description: "For the past week, Route 3 has been arriving 15-20 minutes late every morning, making students late for the first period.",
      raisedBy: { raisedByType: "parent", raisedByName: "Kavitha Iyer", raisedByContact: "+91 98450 70002", studentIndex: 1 },
      assignedTo: principal,
    },
    {
      daysBack: 25,
      category: "academic",
      priority: "low",
      status: "closed",
      subject: "Request for extra doubt-clearing sessions in Mathematics",
      description: "Several students in Grade 10-B have asked for an additional weekly doubt-clearing session before the term exams.",
      raisedBy: { raisedByType: "student", studentIndex: 3 },
      assignedTo: principal,
      resolutionNotes: "Approved — a weekly Saturday session has been added to the timetable starting next week.",
      resolvedHoursAfterCreation: 72,
    },
    {
      daysBack: 2,
      category: "discipline",
      priority: "urgent",
      status: "in_progress",
      subject: "Bullying incident reported in Grade 8",
      description: "A parent has reported repeated bullying incidents involving their child during lunch break.",
      raisedBy: { raisedByType: "parent", raisedByName: "Salim Ahmed", raisedByContact: "+91 98450 70003" },
      assignedTo: security,
      comments: [
        { hoursAfterCreation: 3, message: "Spoke with the class teacher and reviewed the CCTV footage from the courtyard.", authorStaffId: security?.id, authorLabel: security ? `${security.firstName} ${security.lastName}` : "Security", visibleToSubmitter: false },
        { hoursAfterCreation: 6, message: "Meeting scheduled with both families and the counsellor for tomorrow.", authorStaffId: security?.id, authorLabel: security ? `${security.firstName} ${security.lastName}` : "Security", visibleToSubmitter: true },
      ],
    },
    {
      daysBack: 10,
      category: "fees_billing",
      priority: "high",
      status: "resolved",
      subject: "Duplicate fee payment reflecting in portal",
      description: "Parent was charged twice for the same term fee installment due to a payment gateway retry.",
      raisedBy: { raisedByType: "parent", raisedByName: "Neeraj Verma", raisedByContact: "+91 98450 70001" },
      assignedTo: accountant,
      resolutionNotes: "Verified the duplicate charge with the payment gateway and processed a refund for the second transaction.",
      resolvedHoursAfterCreation: 36,
    },
    {
      daysBack: 4,
      category: "fees_billing",
      priority: "medium",
      status: "open",
      subject: "Refund request for cancelled transport service",
      description: "Family opted out of the bus service mid-term and is requesting a pro-rated refund for the remaining months.",
      raisedBy: { raisedByType: "parent", raisedByName: "Rohit Gupta", raisedByContact: "+91 98450 70005" },
      assignedTo: accountant,
    },
    {
      daysBack: 6,
      category: "other",
      priority: "low",
      status: "open",
      subject: "Request to organize a science exhibition",
      description: "Proposing an inter-class science exhibition next month — would need auditorium booking and a budget sign-off.",
      raisedBy: { raisedByType: "staff", staffMember: teacher },
    },
    {
      daysBack: 8,
      category: "academic",
      priority: "high",
      status: "reopened",
      subject: "Mismatch in report card marks",
      description: "The marks shown on the printed report card don't match what was communicated after the term exam.",
      raisedBy: { raisedByType: "student", studentIndex: 4 },
      assignedTo: principal,
      comments: [
        { hoursAfterCreation: 20, message: "Cross-checked with the exam office — marks were corrected and a revised report card was issued.", authorStaffId: principal?.id, authorLabel: principal ? `${principal.firstName} ${principal.lastName}` : "Principal", visibleToSubmitter: true },
        { hoursAfterCreation: 40, message: "Reopened — the revised copy still shows the old Science mark. Escalating again.", authorLabel: "Front desk", visibleToSubmitter: true },
      ],
    },
    {
      daysBack: 7,
      category: "it_support",
      priority: "urgent",
      status: "open",
      subject: "Wifi down in hostel block",
      description: "The wifi access point in the boys' hostel block has been down since last night, affecting evening study hours.",
      raisedBy: { raisedByType: "staff", staffMember: warden },
    },
  ];

  const ticketNumbers: string[] = [];
  const tickets: Ticket[] = seeds.map((seed) => {
    const createdAt = daysAgo(seed.daysBack);
    const ticketNumber = nextTicketNumber(ticketNumbers);
    ticketNumbers.push(ticketNumber);

    const raisedBy =
      seed.raisedBy.raisedByType === "student"
        ? { raisedByType: "student" as const, raisedByStudentId: activeStudents[seed.raisedBy.studentIndex % activeStudents.length]?.id }
        : seed.raisedBy.raisedByType === "staff"
          ? { raisedByType: "staff" as const, raisedByStaffId: seed.raisedBy.staffMember?.id }
          : {
              raisedByType: "parent" as const,
              raisedByName: seed.raisedBy.raisedByName,
              raisedByContact: seed.raisedBy.raisedByContact,
              raisedByStudentId: seed.raisedBy.studentIndex !== undefined ? activeStudents[seed.raisedBy.studentIndex % activeStudents.length]?.id : undefined,
            };

    const comments: TicketComment[] = (seed.comments ?? []).map((c) => ({
      id: genId("comment"),
      message: c.message,
      authorStaffId: c.authorStaffId,
      authorLabel: c.authorLabel,
      createdAt: hoursAgo(seed.daysBack * 24 - c.hoursAfterCreation),
      visibleToSubmitter: c.visibleToSubmitter,
    }));

    const lastCommentAt = comments.length > 0 ? comments[comments.length - 1].createdAt : createdAt;
    const resolvedAt = seed.resolvedHoursAfterCreation !== undefined ? hoursAgo(seed.daysBack * 24 - seed.resolvedHoursAfterCreation) : undefined;

    return {
      id: genId("ticket"),
      ticketNumber,
      category: seed.category,
      priority: seed.priority,
      status: seed.status,
      subject: seed.subject,
      description: seed.description,
      ...raisedBy,
      assignedToStaffId: seed.assignedTo?.id,
      createdAt,
      updatedAt: resolvedAt ?? lastCommentAt,
      resolvedAt,
      resolutionNotes: seed.resolutionNotes,
      comments,
    };
  });

  return tickets;
}
