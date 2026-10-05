import { brandingFor, DEFAULT_BRAND_NAME, DEFAULT_BRANDING } from "./branding";
import type { TenantProfile } from "./api";

const profile = (over: Partial<TenantProfile> = {}): TenantProfile => ({
  tenantId: "tenant-gv",
  subdomain: "greenvalley",
  domain: "greenvalley.sms-schoolsphere.com",
  schoolName: "Green Valley Public School",
  ...over,
});

describe("brandingFor", () => {
  it("uses School Sphere's defaults when there is no school", () => {
    expect(brandingFor(null)).toBe(DEFAULT_BRANDING);
    expect(DEFAULT_BRANDING.name).toBe(DEFAULT_BRAND_NAME);
  });

  it("uses every tenant value that exists", () => {
    const b = brandingFor(profile({ logoUrl: "https://x/logo.png", email: "admin@gv.edu", contactNumber: "+91 98765 43210" }));
    expect(b).toMatchObject({ name: "Green Valley Public School", logoUrl: "https://x/logo.png", email: "admin@gv.edu", contactNumber: "+91 98765 43210", isTenant: true });
  });

  it("keeps the tenant name when the logo is empty (logo falls back, name does not)", () => {
    const b = brandingFor(profile({ logoUrl: undefined }));
    expect(b.name).toBe("Green Valley Public School");
    expect(b.logoUrl).toBeUndefined();
  });

  it("falls back to School Sphere's name when the school name is blank, keeping the tenant logo", () => {
    const b = brandingFor(profile({ schoolName: "  ", logoUrl: "https://x/logo.png" }));
    expect(b.name).toBe(DEFAULT_BRAND_NAME);
    expect(b.logoUrl).toBe("https://x/logo.png");
  });

  it("leaves blank email and contact number undefined so nothing is shown", () => {
    const b = brandingFor(profile({ email: " ", contactNumber: "" }));
    expect(b.email).toBeUndefined();
    expect(b.contactNumber).toBeUndefined();
  });
});
