// What a signed-in user of each role does in one sitting, using the same GETs the UI pages make.
// Read-only on purpose: safe to repeat thousands of times without filling the database with junk.
import { group, sleep } from "k6";
import { ensureSession, get, list, pageItems } from "./api.js";

const today = () => new Date().toISOString().slice(0, 10);

// Seconds a person spends looking at a page before clicking on.
const think = (min = 1, max = 4) => sleep(min + Math.random() * (max - min));

/** Shell every page loads: notification bell + branch switcher. */
function appShell() {
  get("engagement", "/api/Notifications/mine/unread-count");
  get("auth", "/api/branches");
}

export function adminJourney() {
  ensureSession("admin");

  group("admin: dashboard", () => {
    appShell();
    // src/features/dashboard/scopeApi.ts fetches these together; the student count is a one-row page.
    get("academic", "/api/students?pageNumber=1&pageSize=1&status=Active", "/api/students?count");
    get("academic", "/api/staff");
    get("finance", "/api/feeinvoices");
    get("meeting", "/api/meetings/today");
  });
  think();

  group("admin: students", () => {
    // StudentManagementPage pages through the list server-side.
    const page = 1 + Math.floor(Math.random() * 5);
    get("academic", `/api/students?pageNumber=${page}&pageSize=25`, "/api/students?page");
    get("academic", "/api/classes");
    get("academic", "/api/sections");
  });
  think();

  group("admin: attendance report", () => {
    get("academic", `/api/attendance/reports/daily/${today()}`, "/api/attendance/reports/daily/{date}");
  });
  think();

  group("admin: fees", () => {
    // InvoicesTab: one page of invoices, then just the students named on it.
    const page = 1 + Math.floor(Math.random() * 5);
    const invoices = get("finance", `/api/feeinvoices?pageNumber=${page}&pageSize=25`, "/api/feeinvoices?page");
    const ids = [...new Set(pageItems(invoices).map((inv) => inv.studentId))];
    if (ids.length > 0) {
      get("academic", `/api/students?pageNumber=1&pageSize=100&ids=${ids.join(",")}`, "/api/students?ids");
    }
    get("finance", "/api/receipts");
    get("finance", "/api/feestructures");
  });
  think();

  group("admin: campus", () => {
    get("campus", "/api/tickets");
    get("campus", "/api/books");
  });
  think();
}

export function teacherJourney() {
  ensureSession("teacher");

  group("teacher: dashboard", () => {
    appShell();
    get("meeting", "/api/meetings/today");
    get("meeting", "/api/meetings/upcoming");
    get("academic", "/api/calendarevents");
  });
  think();

  group("teacher: take attendance", () => {
    const sections = list(get("academic", "/api/attendance/roster-sections"));
    const section = sections[Math.floor(Math.random() * sections.length)];
    const sectionId = section && section.sectionId;
    if (sectionId) {
      get("academic", `/api/attendance/sections/${sectionId}/roster`, "/api/attendance/sections/{id}/roster");
      get(
        "academic",
        `/api/attendance/sections/${sectionId}/date/${today()}`,
        "/api/attendance/sections/{id}/date/{date}",
      );
    }
  });
  think(3, 8);

  group("teacher: homework & exams", () => {
    get("academic", "/api/homework");
    get("academic", "/api/exams");
    get("academic", "/api/subjects");
  });
  think();
}

export function parentJourney() {
  ensureSession("parent");

  group("parent: home", () => {
    appShell();
    get("engagement", "/api/Notifications/mine");
    get("meeting", "/api/meetings/upcoming");
  });
  think();

  group("parent: child progress", () => {
    get("academic", "/api/homework");
    get("academic", "/api/exams");
    get("academic", "/api/calendarevents");
  });
  think();

  group("parent: fees", () => {
    get("finance", "/api/feeinvoices");
    get("finance", "/api/receipts");
  });
  think(2, 6);
}
