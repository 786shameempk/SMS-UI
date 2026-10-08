import * as certs from "./api";
import * as settings from "@/features/settings/api";
import { applyBrandPreset, applyDensityPreset, applyRadiusPreset } from "@/features/settings/theme";
import { academicHttpClient, authHttpClient, campusHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [
    { id: "st1", firstName: "Asha", lastName: "N", admissionNumber: "ADM-1", className: "Class 5", section: "A", admissionDate: "2020-06-01", transferRecord: undefined },
    { id: "st2", firstName: "Ravi", lastName: "K", admissionNumber: "ADM-2", className: "Class 9", section: "B", admissionDate: "2018-06-01",
      transferRecord: { transferredAt: "2026-05-01", toSchool: "City School", reason: "Relocation", transferCertificateNumber: "TC-2026-0042" } },
  ]),
}));
vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [
    { id: "sf1", firstName: "Meera", lastName: "Rao", employeeId: "EMP-1", designation: "Teacher", department: "Science", joiningDate: "2015-06-01" },
    { id: "sf2", firstName: "Joy", lastName: "P", employeeId: "EMP-2", designation: "Driver", department: "Transport", joiningDate: "2010-01-01", resignation: { lastWorkingDate: "2026-03-31" } },
  ]),
}));
vi.mock("@/features/settings/theme", () => ({ applyBrandPreset: vi.fn(), applyRadiusPreset: vi.fn(), applyDensityPreset: vi.fn(), normalizeBrandPreset: (v: string) => v }));

const issued = (overrides: Record<string, unknown> = {}) => ({
  id: "c1", tenantId: "t", branchId: "b", certificateNumber: "BON-2026-0001", type: "StaffService", recipientType: "Staff", recipientId: "sf1",
  recipientName: "Meera Rao", recipientSubtitle: "", issuedOn: "", bodyLines: [], meta: [], ...overrides,
});

describe("certificates api", () => {
  it("lists, reads and deletes issued certificates", async () => {
    stubClient(campusHttpClient, {
      "GET /api/issuedcertificates": [issued(), issued({ id: "c2", type: "?", recipientType: "?" })],
      "GET /api/issuedcertificates/c1": issued(),
      "DELETE /api/issuedcertificates/c1": null,
    });

    expect((await certs.listIssuedCertificates()).map((c) => [c.type, c.recipientType])).toEqual([["staff_service", "staff"], ["bonafide", "student"]]);
    expect((await certs.getIssuedCertificate("c1")).recipientName).toBe("Meera Rao");
    await certs.deleteIssuedCertificate("c1");
  });

  it("generates each student certificate from the student record", async () => {
    const calls = stubClient(campusHttpClient, { "POST /api/issuedcertificates": issued() });

    await certs.generateBonafide({ studentId: "st1", purpose: " passport " } as never);
    await certs.generateCharacterCertificate({ studentId: "st1" } as never);
    await certs.generateTransferCertificate({ studentId: "st2" } as never);
    await certs.generateStudyCertificate({ studentId: "st1", fromDate: "2020-06-01", toDate: "2026-03-31", purpose: "visa" } as never);
    await certs.generateAchievementCertificate({ studentId: "st1", event: " Science Fair ", achievement: " First prize ", eventDate: "2026-01-20" } as never);

    const [bonafide, character, transfer, study, achievement] = calls.map((c) => c.body as Record<string, any>);
    expect(bonafide).toMatchObject({ type: "Bonafide", recipientType: "Student", recipientId: "st1", recipientName: "Asha N", recipientSubtitle: "Class 5 - A · ADM-1", certificateNumberOverride: null });
    expect(bonafide.bodyLines).toHaveLength(3);
    expect(bonafide.bodyLines[2]).toBe("This certificate is issued for the purpose of passport.");
    expect(bonafide.meta).toEqual([{ label: "Purpose", value: "passport" }]);
    expect(character.bodyLines).toHaveLength(1);
    expect(character.meta).toEqual([{ label: "Purpose", value: "General" }]);
    expect(transfer).toMatchObject({ type: "Transfer", certificateNumberOverride: "TC-2026-0042" });
    expect(transfer.bodyLines[1]).toBe("The student is being transferred to City School.");
    expect(study.type).toBe("Study");
    expect(study.meta[0].label).toBe("Period");
    expect(achievement.meta.map((m: { value: string }) => m.value).slice(0, 2)).toEqual(["Science Fair", "First prize"]);
  });

  it("guards bad inputs", async () => {
    await expect(certs.generateBonafide({ studentId: "nobody" } as never)).rejects.toThrow("Student not found");
    await expect(certs.generateTransferCertificate({ studentId: "st1" } as never)).rejects.toThrow(/no transfer record/);
    await expect(certs.generateStudyCertificate({ studentId: "st1", fromDate: "2026-01-02", toDate: "2026-01-01" } as never)).rejects.toThrow("End date can't be before the start date");
    await expect(certs.generateStaffServiceCertificate({ staffId: "nobody" } as never)).rejects.toThrow("Staff member not found");
  });

  it("staff service certificates describe current or past employment", async () => {
    const calls = stubClient(campusHttpClient, { "POST /api/issuedcertificates": issued() });

    await certs.generateStaffServiceCertificate({ staffId: "sf1", purpose: "loan" } as never);
    await certs.generateStaffServiceCertificate({ staffId: "sf2" } as never);

    const [current, former] = calls.map((c) => c.body as Record<string, any>);
    expect(current).toMatchObject({ type: "StaffService", recipientType: "Staff", recipientSubtitle: "Teacher · EMP-1" });
    expect(current.bodyLines[0]).toContain("continues to be employed here");
    expect(current.bodyLines).toHaveLength(2);
    expect(former.bodyLines[0]).toMatch(/from .* to /);
  });
});

describe("settings api", () => {
  const apiSettings = {
    profile: { name: "GVS", tagline: null, address: "Kochi", phone: "1", email: "a@b", principalName: null, establishedYear: null },
    localization: { timeZone: "Asia/Kolkata" },
    appearance: { brandPreset: "teal", radiusPreset: "rounded", densityPreset: "compact" },
  };

  it("reads the settings sections", async () => {
    stubClient(authHttpClient, { "GET /api/settings": apiSettings });

    expect(await settings.getSchoolProfile()).toMatchObject({ name: "GVS", tagline: undefined, establishedYear: undefined });
    expect(await settings.getLocalization()).toEqual({ timeZone: "Asia/Kolkata" });
    expect([await settings.getBrandPreset(), await settings.getRadiusPreset(), await settings.getDensityPreset()]).toEqual(["teal", "rounded", "compact"]);
  });

  it("saves the profile and applies appearance changes immediately", async () => {
    const calls = stubClient(authHttpClient, {
      "PUT /api/settings/profile": apiSettings.profile,
      "PUT /api/settings/localization": { timeZone: "UTC" },
      "PATCH /api/settings/appearance": (_u: string, body: Record<string, string>) => ({ ...apiSettings.appearance, ...body }),
    });

    await settings.updateSchoolProfile({ name: "GVS", tagline: "", address: "Kochi", phone: "1", email: "a@b" } as never);
    await settings.updateLocalization({ timeZone: "UTC" } as never);
    expect(await settings.updateBrandPreset("indigo" as never)).toBe("indigo");
    expect(await settings.updateRadiusPreset("sharp" as never)).toBe("sharp");
    expect(await settings.updateDensityPreset("comfortable" as never)).toBe("comfortable");

    expect(calls[0].body).toMatchObject({ tagline: null, principalName: null, establishedYear: null });
    expect(applyBrandPreset).toHaveBeenCalledWith("indigo");
    expect(applyRadiusPreset).toHaveBeenCalledWith("sharp");
    expect(applyDensityPreset).toHaveBeenCalledWith("comfortable");
  });

  it("templates, audit log, backups, subscription and plan usage", async () => {
    const calls = stubClient(authHttpClient, {
      "GET /api/settings/templates": [{ id: "tp1", channel: "Sms", subject: null, body: "Hi" }, { id: "tp2", channel: "Email", subject: "S", body: "B" }],
      "PUT /api/settings/templates/tp2": { id: "tp2", channel: "Email", subject: null, body: "New" },
      "GET /api/settings/audit-log": [{ id: "a1", detail: null }],
      "GET /api/settings/backups": [{ id: "bk1" }],
      "GET /api/settings/subscription": { plan: "Growth" },
    });
    stubClient(academicHttpClient, { "GET /api/stats/plan-usage": { students: 300 } });

    expect((await settings.listSystemTemplates()).map((t) => [t.channel, t.subject])).toEqual([["sms", undefined], ["email", "S"]]);
    expect((await settings.updateSystemTemplate("tp2", { subject: "", body: "New" } as never)).body).toBe("New");
    expect((await settings.listAuditLog())[0].detail).toBeUndefined();
    expect(await settings.listBackupHistory()).toHaveLength(1);
    expect(await settings.getSubscription()).toEqual({ plan: "Growth" });
    expect(await settings.getPlanUsage()).toEqual({ students: 300 });
    expect(calls[1].body).toEqual({ subject: null, body: "New" });
  });

  it("exports a backup as a JSON download", async () => {
    stubClient(authHttpClient, { "GET /api/settings/backups/export": { profile: {}, appearance: {} } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();

    const result = await settings.exportBackup();

    expect(result.filename).toMatch(/^school-sphere-config-\d{4}-\d{2}-\d{2}\.json$/);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(click).toHaveBeenCalled();
  });

  it("restores only files that look like a configuration backup", async () => {
    const calls = stubClient(authHttpClient, { "POST /api/settings/backups/import": null });
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });

    await expect(settings.restoreBackup(new File(["not json"], "b.json"))).rejects.toThrow(/could not be parsed/);
    await expect(settings.restoreBackup(new File(['{"x":1}'], "b.json"))).rejects.toThrow(/doesn't look like/);
    await settings.restoreBackup(new File(['{"profile":{},"appearance":{}}'], "b.json"));

    expect(calls[0].body).toEqual({ profile: {}, appearance: {} });
  });

  it("errors carry the server's message", async () => {
    vi.spyOn(authHttpClient, "get").mockRejectedValue(apiError(403, { title: "Admins only" }));
    await expect(settings.getSubscription()).rejects.toThrow("Admins only");
  });
});
