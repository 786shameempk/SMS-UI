import { campusHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";
import * as tracking from "./trackingApi";

const mine = (over = {}) => ({
  studentId: "st1",
  routeId: "rt1",
  routeName: "Route A",
  startTime: "07:00",
  endTime: "08:30",
  stopId: "s2",
  stops: [
    { id: "s2", name: "Stop 2", sequence: 2, arrivalTime: "07:15", landmark: null },
    { id: "s1", name: "Stop 1", sequence: 1, arrivalTime: "07:05", landmark: "Temple" },
  ],
  bus: { id: "bus1", regNumber: "KL-10-A-1", model: "Tata", capacity: 40 },
  live: { status: "AtStop", currentStopIndex: 0, speedKmph: 0, lastUpdated: "2026-01-01T07:00:00" },
  source: "Mock",
  position: null,
  ...over,
});

beforeEach(() => localStorage.clear());

describe("tracking settings", () => {
  it("reads the server's choice", async () => {
    stubClient(campusHttpClient, { "GET /api/transportsettings": { source: "Hardware" } });
    expect(await tracking.getTrackingSettings()).toEqual({ source: "hardware" });
  });

  it("falls back to this browser's choice, then Demo, when the server has no settings endpoint", async () => {
    stubClient(campusHttpClient, {});
    expect(await tracking.getTrackingSettings()).toEqual({ source: "mock" });
    localStorage.setItem("sms.transport.trackingSource", "driver-phone");
    expect(await tracking.getTrackingSettings()).toEqual({ source: "driver-phone" });
  });

  it("saves to the server and reports when it could only save locally", async () => {
    stubClient(campusHttpClient, { "PUT /api/transportsettings": { source: "DriverPhone" } });
    expect(await tracking.updateTrackingSettings("driver-phone")).toEqual({ source: "driver-phone", savedOnServer: true });

    stubClient(campusHttpClient, {});
    expect(await tracking.updateTrackingSettings("hardware")).toEqual({ source: "hardware", savedOnServer: false });
    expect(localStorage.getItem("sms.transport.trackingSource")).toBe("hardware");
  });
});

describe("fleet positions (admin / principal)", () => {
  it("keys the latest fix by bus and treats a missing endpoint as no positions", async () => {
    stubClient(campusHttpClient, {
      "GET /api/buspositions": [{ busId: "bus1", latitude: 11.25, longitude: 75.78, speedKmph: 31.6, heading: null, recordedAt: "2026-01-01T07:00:00", source: "Hardware" }],
    });
    const result = await tracking.listBusPositions();
    expect(result.bus1).toMatchObject({ latitude: 11.25, speedKmph: 32, heading: undefined, source: "hardware", recordedAt: "2026-01-01T07:00:00Z" });

    stubClient(campusHttpClient, {});
    expect(await tracking.listBusPositions()).toEqual({});
  });
});

describe("child bus tracking (parent)", () => {
  it("maps the child's route from /api/transport/mine, with ordered stops and UTC times", async () => {
    stubClient(campusHttpClient, {
      "GET /api/transport/mine": [
        mine({ source: "DriverPhone", position: { latitude: 1, longitude: 2, speedKmph: 20.4, heading: 90, recordedAt: "2026-01-01T07:00:00" } }),
        mine({ studentId: "other" }),
      ],
    });
    const result = await tracking.getChildBusTracking("st1");
    expect(result?.stops.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(result?.stops[0].landmark).toBe("Temple");
    expect(result?.live).toMatchObject({ status: "at-stop", lastUpdated: "2026-01-01T07:00:00Z" });
    expect(result?.source).toBe("driver-phone");
    expect(result?.position).toMatchObject({ speedKmph: 20, heading: 90, recordedAt: "2026-01-01T07:00:00Z" });
  });

  it("returns null when the child has no active transport", async () => {
    stubClient(campusHttpClient, { "GET /api/transport/mine": [mine({ studentId: "other" })] });
    expect(await tracking.getChildBusTracking("st1")).toBeNull();
  });
});

describe("driver's own bus", () => {
  it("asks the server for the buses this login drives", async () => {
    stubClient(campusHttpClient, { "GET /api/buspositions/my-buses": [{ busId: "b1", regNumber: "KL-1", model: "Tata", routeName: "Route A" }] });
    expect(await tracking.getMyDriverBuses()).toEqual([{ busId: "b1", regNumber: "KL-1", model: "Tata", routeName: "Route A" }]);
  });
});
