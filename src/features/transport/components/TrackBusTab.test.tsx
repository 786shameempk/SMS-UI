import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import TrackBusTab from "./TrackBusTab";
import * as trackingApi from "../trackingApi";
import type { ChildBusTracking, TrackingSource } from "../types";

vi.mock("./BusMap", () => ({ default: ({ markers }: { markers: { label: string }[] }) => <div data-testid="bus-map">{markers.map((m) => m.label).join(",")}</div> }));
vi.mock("../trackingApi");

const stops = [
  { id: "s1", name: "Mavoor Road", sequence: 1, arrivalTime: "07:00" },
  { id: "s2", name: "Kunnamangalam", sequence: 2, arrivalTime: "07:15" },
  { id: "s3", name: "Medical College", sequence: 3, arrivalTime: "07:30" },
];

function child(over: Partial<ChildBusTracking> = {}): ChildBusTracking {
  return {
    studentId: "st1",
    routeId: "rt1",
    routeName: "Route A",
    startTime: "07:00",
    endTime: "08:30",
    stopId: "s2",
    stops,
    bus: { id: "bus1", regNumber: "KL-10-A-1", model: "Tata", capacity: 40 },
    live: null,
    source: "mock",
    position: null,
    ...over,
  };
}

const fix = (ageMs = 0) => ({ latitude: 11.25, longitude: 75.78, speedKmph: 28, recordedAt: new Date(Date.now() - ageMs).toISOString() });

function setup(data: ChildBusTracking | null) {
  vi.mocked(trackingApi.getChildBusTracking).mockResolvedValue(data);
  return renderWithProviders(<TrackBusTab studentId="st1" />);
}

describe("TrackBusTab", () => {
  it("tells the parent when the child has no bus", async () => {
    setup(null);
    expect(await screen.findByText("No school bus assigned")).toBeInTheDocument();
  });

  it("demo mode shows how many stops away the bus is and labels the movement as simulated", async () => {
    setup(child({ live: { status: "on-route", currentStopIndex: 0, speedKmph: 20, lastUpdated: new Date().toISOString() } }));
    expect(await screen.findByText("The bus is 1 stop away from your child's stop.")).toBeInTheDocument();
    expect(screen.getByText(/movement is simulated/i)).toBeInTheDocument();
    expect(screen.getByText("Your stop")).toBeInTheDocument();
    expect(screen.queryByTestId("bus-map")).not.toBeInTheDocument();
  });

  it("demo mode says the bus has not started when idle", async () => {
    setup(child());
    expect(await screen.findByText("The bus has not started its trip yet.")).toBeInTheDocument();
  });

  it.each<[TrackingSource, string]>([
    ["driver-phone", "Driver phone"],
    ["hardware", "GPS tracker"],
  ])("%s mode shows the map once the bus has reported", async (source, badge) => {
    setup(child({ source, position: fix() }));
    expect(await screen.findByTestId("bus-map")).toHaveTextContent("KL-10-A-1");
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(screen.getByText("28 km/h")).toBeInTheDocument();
    expect(screen.queryByText(/movement is simulated/i)).not.toBeInTheDocument();
  });

  it("real mode flags an old position as last seen", async () => {
    setup(child({ source: "hardware", position: fix(10 * 60_000) }));
    expect(await screen.findByText("Last seen")).toBeInTheDocument();
  });

  it("real mode waits politely when the bus has never reported", async () => {
    setup(child({ source: "hardware" }));
    expect(await screen.findByText("Waiting for the bus to share its location")).toBeInTheDocument();
    expect(screen.getByText(/GPS tracker hasn't reported yet/)).toBeInTheDocument();
  });
});
