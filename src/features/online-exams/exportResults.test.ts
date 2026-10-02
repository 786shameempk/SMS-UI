import { downloadResultsCsv, printResults } from "./exportResults";

const results = {
  exam: { name: 'Term 1: "Maths" <A>', timeZoneId: "Asia/Kolkata", subjectName: "Maths", className: "Class 5", totalMarks: 20, passingMarks: 7.5 },
  summary: { totalStudents: 3, appeared: 2, absent: 1, passed: 1, failed: 1, averageScore: 12.25, highestScore: 18, lowestScore: 6.5 },
  rows: [
    { rollNumber: "1", studentName: "Nair, Asha", classLabel: "Class 5 - A", score: 18, percentage: 90, grade: "A", status: "Passed", submittedAt: "2026-09-10T05:00:00Z" },
    { rollNumber: null, studentName: "Ravi", classLabel: null, score: null, percentage: null, grade: null, status: "Absent", submittedAt: null },
  ],
};

describe("exam results export", () => {
  it("downloads an Excel-friendly CSV with quoted cells and a safe file name", async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => ((blob = b), "blob:results"));
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("Term-1-Maths-A-results.csv");
    });

    downloadResultsCsv(results as never);

    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:results");
    const text = await blob!.text();
    const lines = text.replace(/^﻿/, "").split("\r\n");
    expect(lines[0]).toBe("Roll no.,Student,Class,Score,Percentage,Grade,Status,Submitted");
    expect(lines[1]).toMatch(/^1,"Nair, Asha",Class 5 - A,18,90%,A,Passed,/);
    expect(lines[2]).toBe(",Ravi,,,,,Absent,");
  });

  it("falls back to a generic file name", () => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("exam-results.csv");
    });

    downloadResultsCsv({ ...results, exam: { ...results.exam, name: "!!!" } } as never);

    expect(click).toHaveBeenCalled();
  });

  it("writes an escaped, printable sheet into a new window", () => {
    const doc = { write: vi.fn(), close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue({ document: doc } as never);

    expect(printResults(results as never, "GVS")).toBe(true);

    const html = doc.write.mock.calls[0][0] as string;
    expect(html).toContain("<title>Term 1: &quot;Maths&quot; &lt;A&gt; - results</title>");
    expect(html).toContain("GVS · Maths · Class 5 · Total 20 · Pass 7.5");
    expect(html).toContain("<div>Average<b>12.3</b></div>");
    expect(html).toContain("<td>Nair, Asha</td>");
    expect(html).not.toContain("<A>");
    expect(doc.close).toHaveBeenCalled();
  });

  it("reports a blocked pop-up", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(printResults(results as never)).toBe(false);
  });
});
