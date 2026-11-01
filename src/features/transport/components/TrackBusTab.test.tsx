import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import TrackBusTab from "./TrackBusTab";
import * as trackingApi from "../trackingApi";
import type { ChildBusTracking, TrackingSource } from "../types";

vi.mock("./BusMap", () => ({ default: ({ markers }: { markers: { label: string }[] }) => <div data-testid="bus-map">{markers.map((m) => m.label).join(",")}</div> }));
vi.mock("../trackingApi");

const stops = [
  { id: "s1", name: "Mavoor Road", sequence: 1, arrivalTime: "07:00", progress: "none" as const },
  { id: "s2", name: "Kunnamangalam", sequence: 2, arrivalTime: "07:15", progress: "none" as const },
  { id: "s3", name: "Medical College", sequence: 3, arrivalTime: "07:30", progress: "none" as const },
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
    trip: null,
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

  describe("stop progress with real GPS", () => {
    const located = (progress: [string, string, string], reachedAt = "2026-10-28T02:10:00Z") =>
      stops.map((st, i) => ({ ...st, progress: progress[i] as "pending" | "reached" | "skipped", reachedAt: progress[i] === "reached" ? reachedAt : undefined }));

    it("says how many stops come before the child, and highlights the next stop", async () => {
      setup(child({ source: "driver-phone", position: fix(), stops: located(["reached", "pending", "pending"]), trip: { startedAt: new Date().toISOString(), running: true } }));
      expect(await screen.findByText("Your child's stop is the next one.")).toBeInTheDocument();
      expect(screen.getByText("Next stop")).toBeInTheDocument();
    });

    it("tells the parent when the bus reached or passed their child's stop", async () => {
      setup(child({ source: "hardware", position: fix(), stops: located(["reached", "reached", "pending"]), trip: { startedAt: new Date().toISOString(), running: true } }));
      expect(await screen.findByText("The bus reached your child's stop.")).toBeInTheDocument();
    });

    it("marks a stop the bus drove past", async () => {
      setup(child({ source: "hardware", position: fix(), stops: located(["reached", "skipped", "pending"]), trip: { startedAt: new Date().toISOString(), running: true } }));
      expect(await screen.findByText("The bus passed your child's stop.")).toBeInTheDocument();
      expect(screen.getByText(/Passed without stopping/)).toBeInTheDocument();
    });

    it("explains why there is no progress when no stop has a map location", async () => {
      setup(child({ source: "hardware", position: fix() }));
      expect(await screen.findByText(/hasn.t set map locations/)).toBeInTheDocument();
    });
  });
});
