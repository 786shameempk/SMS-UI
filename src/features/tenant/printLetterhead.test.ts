import { contactLine, letterheadHtml } from "./printLetterhead";
import { DEFAULT_BRANDING } from "./branding";

describe("printed letterhead", () => {
  it("shows the school's logo, name, contact details and address, escaped", () => {
    const html = letterheadHtml({
      name: "Green <Valley>", logoUrl: "https://x.test/l.png?a=1&b=2", email: "admin@gv.edu", contactNumber: "+91 98765 43210", address: "1 Main Rd", isTenant: true,
    });

    expect(html).toContain('<img src="https://x.test/l.png?a=1&amp;b=2"');
    expect(html).toContain("<b>Green &lt;Valley&gt;</b>");
    expect(html).toContain("admin@gv.edu · +91 98765 43210");
    expect(html).toContain("1 Main Rd");
  });

  it("falls back to School Sphere's name and leaves out anything not configured", () => {
    const html = letterheadHtml(DEFAULT_BRANDING);

    expect(html).toContain("<b>School Sphere</b>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<span>");
  });

  it("joins only the contact details that exist", () => {
    expect(contactLine({ email: "a@b.c" })).toBe("a@b.c");
    expect(contactLine({ contactNumber: "123" })).toBe("123");
    expect(contactLine({})).toBe("");
  });
});
