import { describe, expect, it } from "vitest";
import { normalizeDate, parseCsv, rowsToRecords } from "./csvParse";
import { parseStaffRow } from "@/features/staff/components/BulkStaffImportDialog";
import { parseStudentRow } from "@/features/students/components/BulkStudentImportDialog";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas, CRLF, BOM and blank lines", () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n1,2');
    expect(rows).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["1", "2"]]);
  });
});

describe("rowsToRecords", () => {
  it("matches headers by label or key ignoring case and punctuation, and reports missing ones", () => {
    const { records, missing } = rowsToRecords(
      [["FIRST NAME", "last_name"], [" Asha ", "Nair"]],
      [{ key: "firstName", label: "First name" }, { key: "lastName", label: "Last name" }, { key: "phone", label: "Phone" }],
    );
    expect(records).toEqual([{ firstName: "Asha", lastName: "Nair", phone: "" }]);
    expect(missing).toEqual(["Phone"]);
  });
});

describe("normalizeDate", () => {
  it("accepts iso and day-first dates and rejects impossible ones", () => {
    expect(normalizeDate("2014-8-21")).toBe("2014-08-21");
    expect(normalizeDate("21/08/2014")).toBe("2014-08-21");
    expect(normalizeDate("31/02/2014")).toBeNull();
    expect(normalizeDate("soon")).toBeNull();
  });
});

describe("import row validation", () => {
  const staff = { firstName: "Asha", lastName: "Nair", dateOfBirth: "15/04/1990", gender: "Female", designation: "teacher", department: "Science", phone: "1", email: "a@b.co", address: "" };
  it("accepts a staff row and normalises case and date", () => {
    const parsed = parseStaffRow(staff);
    expect(parsed.ok && parsed.value).toMatchObject({ gender: "female", designation: "Teacher", dateOfBirth: "1990-04-15" });
  });
  it("rejects a staff row with an unknown designation or bad email", () => {
    expect(parseStaffRow({ ...staff, designation: "Wizard" }).ok).toBe(false);
    expect(parseStaffRow({ ...staff, email: "nope" }).ok).toBe(false);
  });

  const student = { firstName: "Rahul", lastName: "Menon", dateOfBirth: "2014-08-21", gender: "male", className: "Class 5", section: "A", rollNumber: "", address: "x", guardianName: "S", guardianRelation: "Father", guardianPhone: "1", studentEmail: "", parentEmail: "" };
  it("accepts a student row and leaves optional fields undefined", () => {
    const parsed = parseStudentRow(student);
    expect(parsed.ok && parsed.value).toMatchObject({ guardianRelation: "father", rollNumber: undefined, parentEmail: undefined });
  });
  it("rejects a student row missing a required field", () => {
    const parsed = parseStudentRow({ ...student, section: "" });
    expect(parsed).toEqual({ ok: false, error: "Missing Section" });
  });
});
