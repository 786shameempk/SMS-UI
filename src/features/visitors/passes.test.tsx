import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { campusHttpClient } from "@/lib/httpClient";
import { renderWithProviders, stubClient } from "@/test/utils";
import * as visitors from "./api";
import PassQrDialog from "./components/PassQrDialog";
import ScanPassDialog from "./components/ScanPassDialog";
import { visitorPassValue } from "./passCode";

const toDataURL = vi.hoisted(() => vi.fn(async () => "data:image/png;base64,AAAA"));
vi.mock("qrcode", () => ({ default: { toDataURL } }));
vi.mock("@/features/students/api", () => ({ listStudents: vi.fn(async () => []) }));
vi.mock("@/features/staff/api", () => ({ listStaff: vi.fn(async () => []) }));
vi.mock("@/features/attendance/methods/camera", () => ({
  cameraSupported: () => false,
  cameraErrorMessage: () => "",
  createDetector: () => null,
  decodeFrame: vi.fn(),
  startCamera: vi.fn(),
  stopCamera: vi.fn(),
}));

const scanBody = (overrides: Record<string, unknown> = {}) => ({
  result: "Inside", message: "Ravi Kumar is on the premises.", visitorName: "Ravi Kumar", badgeNumber: "VIS-0001", purpose: "Pickup",
  checkInAt: "2026-10-23T09:00:00Z", checkOutAt: null, scheduledAt: null, visitorEntryId: "ve1", preApprovalId: null, ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe("visitor passes api", () => {
  it("maps the pass token of badges and invitations", async () => {
    stubClient(campusHttpClient, {
      "GET /api/preapprovedvisits": [
        { id: "p1", tenantId: "t", branchId: "b", visitorName: "Meera", phone: "1", purpose: "Meeting", purposeNotes: null, hostType: "Other", hostStudentId: null, hostStaffId: null, hostOtherLabel: "Office",
          scheduledAt: "2026-10-24T10:00:00Z", status: "Scheduled", visitorEntryId: null, passToken: "tok123tok123tok123tok1", passExpiresAt: "2026-10-25T10:00:00Z" },
      ],
    });

    const [visit] = await visitors.listPreApprovedVisits();

    expect(visit).toMatchObject({ passToken: "tok123tok123tok123tok1", passExpiresAt: "2026-10-25T10:00:00Z" });
  });

  it("scan maps the answer and posts only the scanned text", async () => {
    const calls = stubClient(campusHttpClient, { "POST /api/visitorentries/scan": scanBody({ result: "ArrivalExpected", visitorEntryId: null, preApprovalId: "p1", purpose: "Weird" }) });

    const scan = await visitors.scanVisitorPass("SSV:tok");

    expect(calls[0].body).toEqual({ token: "SSV:tok" });
    expect(scan).toMatchObject({ result: "arrival-expected", preApprovalId: "p1", purpose: "other" });
  });

  it("an answer this version does not know is treated as unknown, never as a green light", async () => {
    stubClient(campusHttpClient, { "POST /api/visitorentries/scan": scanBody({ result: "SomethingNew" }) });
    expect((await visitors.scanVisitorPass("x")).result).toBe("unknown");
  });

  it("prefixes the QR value so a scanner can tell visitor passes from attendance passes", () => {
    expect(visitorPassValue("abc")).toBe("SSV:abc");
  });
});

describe("PassQrDialog", () => {
  it("draws the QR for the prefixed token and shows the code in words as well", async () => {
    renderWithProviders(
      <PassQrDialog subject={{ kind: "badge", visitorName: "Ravi Kumar", badgeNumber: "VIS-0001", token: "tok123tok123tok123tok1", at: "2026-10-23T09:00:00Z" }} onClose={() => undefined} />,
    );

    expect(await screen.findByAltText("QR code for this pass")).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(toDataURL).toHaveBeenCalledWith("SSV:tok123tok123tok123tok1", expect.anything());
    expect(screen.getByText("tok123tok123tok123tok1")).toBeInTheDocument();
    expect(screen.getByText("Badge VIS-0001")).toBeInTheDocument();
  });
});

describe("ScanPassDialog", () => {
  it("looks up a typed code, then checks the visitor out only when staff press the button", async () => {
    const calls = stubClient(campusHttpClient, {
      "POST /api/visitorentries/scan": scanBody(),
      "POST /api/visitorentries/ve1/check-out": { id: "ve1", tenantId: "t", branchId: "b", visitorName: "Ravi Kumar", phone: "1", purpose: "Pickup", hostType: "Other", badgeNumber: "VIS-0001", checkInAt: "2026-10-23T09:00:00Z", checkOutAt: "2026-10-23T10:00:00Z", status: "CheckedOut" },
    });
    renderWithProviders(<ScanPassDialog open onOpenChange={() => undefined} />);

    await userEvent.type(screen.getByLabelText("Pass code"), "SSV:tok123tok123tok123tok1");
    await userEvent.click(screen.getByRole("button", { name: /Look up/ }));

    expect(await screen.findByText("Ravi Kumar is on the premises.")).toBeInTheDocument();
    expect(calls.map((c) => c.url)).toEqual(["/api/visitorentries/scan"]);

    await userEvent.click(screen.getByRole("button", { name: "Check out" }));
    await waitFor(() => expect(calls.map((c) => c.url)).toContain("/api/visitorentries/ve1/check-out"));
  });

  it("offers check-in for an expected arrival and nothing for an unknown pass", async () => {
    stubClient(campusHttpClient, {
      "POST /api/visitorentries/scan": (_u: string, body: unknown) =>
        (body as { token: string }).token === "bad"
          ? scanBody({ result: "Unknown", message: "Not a pass from this school.", visitorName: null, visitorEntryId: null })
          : scanBody({ result: "ArrivalExpected", message: "Meera is expected.", visitorEntryId: null, preApprovalId: "p1", scheduledAt: "2026-10-23T10:00:00Z" }),
    });
    renderWithProviders(<ScanPassDialog open onOpenChange={() => undefined} />);
    const input = screen.getByLabelText("Pass code");

    await userEvent.type(input, "good{enter}");
    expect(await screen.findByRole("button", { name: "Check in" })).toBeInTheDocument();

    await userEvent.type(input, "bad{enter}");
    expect(await screen.findByText("Not a pass from this school.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check out" })).not.toBeInTheDocument();
  });
});
