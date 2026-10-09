import { screen } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";
import TransportManagementPage from "./TransportManagementPage";

vi.mock("../components/RoutesTab", () => ({ default: () => <div>routes tab</div> }));
vi.mock("../components/BusesTab", () => ({ default: () => <div>buses tab</div> }));
vi.mock("../components/DriversTab", () => ({ default: () => <div>drivers tab</div> }));
vi.mock("../components/StudentAssignmentsTab", () => ({ default: () => <div>assignments tab</div> }));
vi.mock("../components/LiveTrackingTab", () => ({ default: () => <div>live tab</div> }));
vi.mock("../components/TrackingSetupTab", () => ({ default: () => <div>setup tab</div> }));
vi.mock("../components/DriverTripTab", () => ({ default: () => <div>driver trip tab</div> }));

const perms = (...granted: string[]) => Object.fromEntries(granted.map((g) => [g, true])) as unknown as ModulePermissions;

afterEach(signOut);

describe("Transport page access", () => {
  it("a driver (Drive a bus trip, no Manage transport) sees only the trip tab", () => {
    signIn("staff", {}, perms("transport", "Staff.Managed", "Transport.DriveTrip"));
    renderWithProviders(<TransportManagementPage />);

    expect(screen.getByRole("tab", { name: "Driver trip" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Buses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Live Tracking" })).not.toBeInTheDocument();
    expect(screen.getByText("driver trip tab")).toBeInTheDocument();
    expect(screen.queryByText("routes tab")).not.toBeInTheDocument();
  });

  it("office staff with Manage transport get the full set, without the trip tab unless they may drive", () => {
    signIn("staff", {}, perms("transport", "Staff.Managed", "Transport.Manage"));
    renderWithProviders(<TransportManagementPage />);

    expect(screen.getByRole("tab", { name: "Buses" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tracking setup" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Driver trip" })).not.toBeInTheDocument();
    expect(screen.getByText("routes tab")).toBeInTheDocument();
  });

  it("a Transport role with neither action is told to ask an administrator", () => {
    signIn("staff", {}, perms("transport", "Staff.Managed"));
    renderWithProviders(<TransportManagementPage />);

    expect(screen.getByText("No transport access")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("a session from before staff actions existed keeps full access", () => {
    signIn("admin", {}, perms("transport"));
    renderWithProviders(<TransportManagementPage />);

    expect(screen.getByRole("tab", { name: "Buses" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Driver trip" })).toBeInTheDocument();
  });
});
