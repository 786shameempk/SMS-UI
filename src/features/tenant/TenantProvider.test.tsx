import { screen, waitFor } from "@testing-library/react";
import { TenantProvider, useTenantBranding } from "./TenantProvider";
import { resolveTenant, TenantNotFoundError } from "./api";
import { renderWithProviders, signOut } from "@/test/utils";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  resolveTenant: vi.fn(),
  getTenantProfile: vi.fn(),
}));

function Probe() {
  const b = useTenantBranding();
  return (
    <div>
      <p>name:{b.name}</p>
      <p>email:{b.email ?? "none"}</p>
      <p>logo:{b.logoUrl ?? "default"}</p>
    </div>
  );
}

function setHost(hostname: string) {
  Object.defineProperty(window, "location", { value: { ...window.location, hostname, origin: `https://${hostname}` }, writable: true, configurable: true });
}

const originalLocation = window.location;
afterEach(() => Object.defineProperty(window, "location", { value: originalLocation, writable: true, configurable: true }));

describe("TenantProvider", () => {
  beforeEach(() => {
    signOut();
    vi.mocked(resolveTenant).mockReset();
  });

  it("shows School Sphere's branding on a host that is not a school's", () => {
    setHost("localhost");
    renderWithProviders(<TenantProvider><Probe /></TenantProvider>);

    expect(screen.getByText("name:School Sphere")).toBeInTheDocument();
    expect(resolveTenant).not.toHaveBeenCalled();
  });

  it("identifies the school from the subdomain and applies its branding field by field", async () => {
    setHost("greenvalley.sms-schoolsphere.com");
    vi.mocked(resolveTenant).mockResolvedValue({
      tenantId: "tenant-gv", subdomain: "greenvalley", domain: "greenvalley.sms-schoolsphere.com", schoolName: "Green Valley Public School",
    });
    renderWithProviders(<TenantProvider><Probe /></TenantProvider>);

    expect(await screen.findByText("name:Green Valley Public School")).toBeInTheDocument();
    expect(screen.getByText("logo:default")).toBeInTheDocument();
    expect(screen.getByText("email:none")).toBeInTheDocument();
    expect(resolveTenant).toHaveBeenCalledWith("greenvalley");
  });

  it("shows Tenant not found instead of the app for an unknown subdomain", async () => {
    setHost("nope.sms-schoolsphere.com");
    vi.mocked(resolveTenant).mockRejectedValue(new TenantNotFoundError("nope"));
    renderWithProviders(<TenantProvider><Probe /></TenantProvider>);

    expect(await screen.findByRole("heading", { name: "Tenant not found" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/name:/)).not.toBeInTheDocument());
  });
});
