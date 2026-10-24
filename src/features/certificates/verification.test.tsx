import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { campusHttpClient } from "@/lib/httpClient";
import { apiError, renderWithProviders, stubClient } from "@/test/utils";
import * as certs from "./api";
import { certificateVerifyUrl } from "./verifyUrl";
import CertificateView from "./components/CertificateView";
import VerifyCertificatePage from "./pages/VerifyCertificatePage";
import type { IssuedCertificate } from "./types";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async () => "data:image/png;base64,AAAA") } }));
vi.mock("@/features/tenant/Letterhead", () => ({ default: () => <div>Letterhead</div> }));
vi.mock("@/features/tenant/TenantProvider", () => ({ useTenantBranding: () => ({ name: "Green Valley School", logoUrl: "" }) }));

const dto = (overrides: Record<string, unknown> = {}) => ({
  id: "c1", tenantId: "t", branchId: "b", certificateNumber: "BON-2026-0001", type: "Bonafide", recipientType: "Student", recipientId: "st1",
  recipientName: "Asha Nair", recipientSubtitle: "Class 5", issuedOn: "2026-10-01T00:00:00Z", bodyLines: ["Body"], meta: [], verificationToken: "abcd1234efgh5678ijkl",
  status: "Valid", schoolName: "Green Valley School", verificationCount: 3, ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe("certificate api: verification", () => {
  it("maps the status, token and replacement links of an issued certificate", async () => {
    stubClient(campusHttpClient, { "GET /api/issuedcertificates": [dto(), dto({ id: "c2", status: "Superseded", replacedById: "c3", revokedReason: "typo" })] });

    const [valid, replaced] = await certs.listIssuedCertificates();

    expect(valid).toMatchObject({ status: "valid", verificationToken: "abcd1234efgh5678ijkl", verificationCount: 3, replacedById: undefined });
    expect(replaced).toMatchObject({ status: "superseded", replacedById: "c3", revokedReason: "typo" });
  });

  it("sends the school name and the reason when revoking or reissuing", async () => {
    certs.setIssuingSchoolName("  Green Valley School ");
    const calls = stubClient(campusHttpClient, {
      "POST /api/issuedcertificates/c1/revoke": dto({ status: "Revoked" }),
      "POST /api/issuedcertificates/c1/reissue": dto({ id: "c9", certificateNumber: "BON-2026-0002" }),
    });

    expect((await certs.revokeCertificate("c1", "wrong child")).status).toBe("revoked");
    const again = await certs.reissueCertificate("c1", { reason: "typo", recipientName: "Asha N" });

    expect(calls[0].body).toEqual({ reason: "wrong child" });
    expect(calls[1].body).toEqual({ reason: "typo", recipientName: "Asha N", schoolName: "Green Valley School" });
    expect(again.certificateNumber).toBe("BON-2026-0002");
    certs.setIssuingSchoolName(undefined);
  });

  it("asks without credentials-bearing toasts and treats an unknown code as null, not an error", async () => {
    const get = vi.spyOn(campusHttpClient, "get").mockRejectedValueOnce(apiError(404)).mockRejectedValueOnce(apiError(429, { title: "Too many attempts. Please wait a minute and try again." }));

    await expect(certs.verifyCertificate("nope")).resolves.toBeNull();
    await expect(certs.verifyCertificate("abc")).rejects.toThrow(/Too many attempts/);

    expect(get).toHaveBeenCalledWith("/api/public/certificates/nope", { silentErrors: true });
  });

  it("builds the verification address from the app origin", () => {
    expect(certificateVerifyUrl("tok")).toBe(`${window.location.origin}/verify/certificate/tok`);
  });
});

describe("VerifyCertificatePage", () => {
  const open = (token = "abcd1234efgh5678ijkl") =>
    renderWithProviders(<VerifyCertificatePage />, { route: `/verify/certificate/${token}`, path: "/verify/certificate/:token" });

  it("shows a valid certificate with who, what and by whom, but no body text", async () => {
    stubClient(campusHttpClient, {
      "GET /api/public/certificates/abcd1234efgh5678ijkl": { status: "Valid", type: "Bonafide", certificateNumber: "BON-2026-0001", recipientName: "Asha Nair", issuedOn: "2026-10-01T00:00:00Z", schoolName: "Green Valley School" },
    });
    open();

    expect(await screen.findByText("Valid certificate")).toBeInTheDocument();
    expect(screen.getByText("BON-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Asha Nair")).toBeInTheDocument();
    expect(screen.getByText("Green Valley School")).toBeInTheDocument();
  });

  it("warns about a replaced certificate and links to the corrected one", async () => {
    stubClient(campusHttpClient, {
      "GET /api/public/certificates/oldtoken": { status: "Superseded", type: "Study", certificateNumber: "STU-1", recipientName: "Asha Nair", issuedOn: "2026-10-01T00:00:00Z", revokedAt: "2026-10-05T00:00:00Z", replacementNumber: "STU-2", replacementToken: "newtoken" },
    });
    open("oldtoken");

    expect(await screen.findByText("Replaced: not valid")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "STU-2" })).toHaveAttribute("href", "/verify/certificate/newtoken");
  });

  it("says plainly when no certificate matches, and offers a retry when the check itself fails", async () => {
    const get = vi.spyOn(campusHttpClient, "get").mockRejectedValueOnce(apiError(404)).mockRejectedValue(apiError(500));
    open("unknown");
    expect(await screen.findByText("Not found")).toBeInTheDocument();
    get.mockClear();

    const { unmount } = open("flaky");
    expect(await screen.findByText(/could not check this certificate/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    unmount();
  });
});

describe("CertificateView", () => {
  const certificate = (overrides: Partial<IssuedCertificate> = {}): IssuedCertificate => ({
    id: "c1", tenantId: "t", branchId: "b", certificateNumber: "BON-2026-0001", type: "bonafide", recipientType: "student", recipientId: "st1", recipientName: "Asha Nair",
    recipientSubtitle: "Class 5", issuedOn: "2026-10-01T00:00:00Z", bodyLines: ["Body"], meta: [], verificationToken: "abcd1234efgh5678ijkl", status: "valid", verificationCount: 0, ...overrides,
  });

  it("prints the QR code and the address it opens, so the paper can be checked by hand too", async () => {
    renderWithProviders(<CertificateView open onOpenChange={() => undefined} certificate={certificate()} />);

    expect(await screen.findByAltText(/QR code to verify/)).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(screen.getByText(`${window.location.origin}/verify/certificate/abcd1234efgh5678ijkl`)).toBeInTheDocument();
    expect(screen.queryByText("Revoked", { selector: "span.uppercase" })).not.toBeInTheDocument();
  });

  it("stamps a revoked certificate so a reprint cannot pass for a valid one", async () => {
    renderWithProviders(<CertificateView open onOpenChange={() => undefined} certificate={certificate({ status: "revoked" })} />);

    expect(await screen.findByText("Revoked", { selector: "span.uppercase" })).toBeInTheDocument();
  });
});
