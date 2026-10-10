import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import type { Student } from "../../types";
import TransportHostelTab from "./TransportHostelTab";

vi.mock("@/features/transport/api", () => ({
  listRoutes: vi.fn(async () => [
    { id: "r1", name: "Route North", status: "active" },
    { id: "r2", name: "Route South", status: "active" },
    { id: "r3", name: "Route Closed", status: "inactive" },
  ]),
  listStops: vi.fn(async (routeId: string) => (routeId === "r1" ? [{ id: "s1", name: "Gate A", sequence: 1 }, { id: "s2", name: "Temple Road", sequence: 2 }] : [{ id: "s3", name: "Market", sequence: 1 }])),
}));
vi.mock("@/features/hostel/api", () => ({
  listHostelMasters: vi.fn(async () => [
    { id: "h1", name: "Boys Hostel", status: "active" },
    { id: "h2", name: "Girls Hostel", status: "active" },
    { id: "h3", name: "Old Wing", status: "inactive" },
  ]),
  listRooms: vi.fn(async (hostelId: string) => (hostelId === "h1" ? [{ id: "m1", roomNumber: "101", floor: "Ground", status: "active" }, { id: "m2", roomNumber: "102", floor: "Ground", status: "maintenance" }] : [{ id: "m3", roomNumber: "201", floor: "First", status: "active" }])),
}));
vi.mock("../../api", () => ({ updateTransport: vi.fn(), updateHostel: vi.fn() }));

const student = (over: Partial<Student> = {}) =>
  ({ id: "st1", transport: { required: true, routeName: "Route North", pickupPoint: "Temple Road" }, hostel: { required: true, hostelName: "Boys Hostel", roomNumber: "101" }, ...over }) as Student;

describe("Transport & Hostel tab", () => {
  it("fills the pickers with what was saved, and offers only the master lists", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransportHostelTab student={student()} />);

    expect(screen.getByRole("combobox", { name: "Route" })).toHaveTextContent("Route North");
    expect(screen.getByRole("combobox", { name: "Pickup point" })).toHaveTextContent("Temple Road");
    expect(screen.getByRole("combobox", { name: "Hostel" })).toHaveTextContent("Boys Hostel");
    expect(screen.getByRole("combobox", { name: "Room number" })).toHaveTextContent("101");

    await user.click(screen.getByRole("combobox", { name: "Route" }));
    expect(await screen.findByRole("option", { name: "Route South" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Route Closed" })).not.toBeInTheDocument();
  });

  it("lists a route's own pickup points and clears the old one when the route changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransportHostelTab student={student()} />);

    await user.click(screen.getByRole("combobox", { name: "Route" }));
    await user.click(await screen.findByRole("option", { name: "Route South" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Pickup point" })).not.toHaveTextContent("Temple Road"));

    await user.click(screen.getByRole("combobox", { name: "Pickup point" }));
    expect(await screen.findByRole("option", { name: "Market" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Gate A" })).not.toBeInTheDocument();
  });

  it("lists the rooms of the chosen hostel only, and leaves out rooms under maintenance", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransportHostelTab student={student()} />);

    await user.click(screen.getByRole("combobox", { name: "Room number" }));
    expect(await screen.findByRole("option", { name: /101/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /102/ })).not.toBeInTheDocument();
  });

  it("keeps a saved name that is no longer in the master list instead of losing it", async () => {
    renderWithProviders(<TransportHostelTab student={student({ transport: { required: true, routeName: "Retired Route", pickupPoint: "Old Stop" } })} />);
    expect(screen.getByRole("combobox", { name: "Route" })).toHaveTextContent("Retired Route");
    expect(screen.getByRole("combobox", { name: "Pickup point" })).toHaveTextContent("Old Stop");
  });

  it("shows nothing to pick when the student does not use transport or hostel", () => {
    renderWithProviders(<TransportHostelTab student={student({ transport: { required: false }, hostel: { required: false } })} />);
    expect(screen.queryByRole("combobox", { name: "Route" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Hostel" })).not.toBeInTheDocument();
  });
});
