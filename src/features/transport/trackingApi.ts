import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { BusPosition, MyDriverBus, BusTrackingStatus, ChildBusTracking, DriverPingValues, TrackingSettings, TrackingSource } from "./types";

// Position tracking sits beside the simulated live status in api.ts. The school chooses the source (demo,
// driver's phone or hardware tracker); only the first one needs no server support beyond what already exists.
//
// Endpoints CampusService must provide for the two real sources:
//   GET  /api/transportsettings                 -> { source }
//   PUT  /api/transportsettings                 { source }
//   GET  /api/buspositions                      -> latest BusPosition DTO per bus (staff fleet view)
//   GET  /api/buspositions/my-buses             -> the buses the signed-in driver drives (needs Transport.DriveTrip)
//   GET  /api/transport/mine                    -> parents: the child's bus incl. source and position
//   POST /api/buspositions/driver-ping          { busId, latitude, longitude, speedKmph, heading?, accuracyMeters? }
//   POST /api/buspositions/device-ping          (called by the GPS hardware itself, authenticated with a device key)

const SOURCE_TO_API: Record<TrackingSource, string> = { mock: "Mock", "driver-phone": "DriverPhone", hardware: "Hardware" };
const SOURCE_FROM_API: Record<string, TrackingSource> = { Mock: "mock", DriverPhone: "driver-phone", Hardware: "hardware" };

const LOCAL_SETTINGS_KEY = "sms.transport.trackingSource";

interface ApiTrackingSettings {
  source: string;
}

interface ApiBusPosition {
  busId: string;
  latitude: number;
  longitude: number;
  speedKmph: number | null;
  heading: number | null;
  recordedAt: string;
  source: string;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

function readLocalSource(): TrackingSource {
  try {
    const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (stored === "mock" || stored === "driver-phone" || stored === "hardware") return stored;
  } catch {
    /* storage unavailable: fall through to the default */
  }
  return "mock";
}

function writeLocalSource(source: TrackingSource) {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, source);
  } catch {
    /* storage unavailable: the choice just won't survive a reload */
  }
}

/** The school's tracking source. Falls back to this browser's saved choice (then Demo) if the server has no settings endpoint yet. */
export async function getTrackingSettings(): Promise<TrackingSettings> {
  try {
    const dto = await unwrap(campusHttpClient.get<ApiTrackingSettings>("/api/transportsettings"));
    return { source: SOURCE_FROM_API[dto.source] ?? "mock" };
  } catch {
    return { source: readLocalSource() };
  }
}

/** `savedOnServer: false` means only this browser remembers the choice, because the server rejected the save. */
export async function updateTrackingSettings(source: TrackingSource): Promise<TrackingSettings & { savedOnServer: boolean }> {
  try {
    const dto = await unwrap(campusHttpClient.put<ApiTrackingSettings>("/api/transportsettings", { source: SOURCE_TO_API[source] }));
    writeLocalSource(SOURCE_FROM_API[dto.source] ?? source);
    return { source: SOURCE_FROM_API[dto.source] ?? source, savedOnServer: true };
  } catch {
    writeLocalSource(source);
    return { source, savedOnServer: false };
  }
}

function mapPosition(dto: ApiBusPosition): BusPosition {
  return {
    busId: dto.busId,
    latitude: dto.latitude,
    longitude: dto.longitude,
    speedKmph: Math.round(dto.speedKmph ?? 0),
    heading: dto.heading ?? undefined,
    recordedAt: asUtc(dto.recordedAt),
    source: dto.source === "Hardware" ? "hardware" : "driver-phone",
  };
}

/** Latest real fix of every bus in the caller's branch (staff fleet view), keyed by bus id. Empty if the server has no positions yet. */
export async function listBusPositions(): Promise<Record<string, BusPosition>> {
  try {
    const rows = (await campusHttpClient.get<ApiBusPosition[]>("/api/buspositions")).data;
    return Object.fromEntries(rows.map((dto) => [dto.busId, mapPosition(dto)] as const));
  } catch {
    return {};
  }
}

/** Sent by the driver's phone while a trip is running. */
export async function sendDriverPing(values: DriverPingValues): Promise<void> {
  await unwrap(
    campusHttpClient.post("/api/buspositions/driver-ping", {
      busId: values.busId,
      latitude: values.latitude,
      longitude: values.longitude,
      speedKmph: Math.max(0, Math.round(values.speedKmph)),
      heading: values.heading ?? null,
      accuracyMeters: values.accuracyMeters ?? null,
    }),
  );
}

interface ApiMyTransport {
  studentId: string;
  routeId: string;
  routeName: string;
  startTime: string;
  endTime: string;
  stopId: string;
  stops: { id: string; name: string; sequence: number; arrivalTime: string; landmark: string | null }[];
  bus: { id: string; regNumber: string; model: string; capacity: number } | null;
  live: { status: string; currentStopIndex: number; speedKmph: number; lastUpdated: string } | null;
  source: string;
  position: { latitude: number; longitude: number; speedKmph: number; heading: number | null; recordedAt: string } | null;
}

const TRACKING_STATUS_FROM_API: Record<string, BusTrackingStatus> = { Idle: "idle", OnRoute: "on-route", AtStop: "at-stop", Completed: "completed" };

/** The server sends UTC timestamps without a zone suffix in some responses; treat them as UTC. */
const asUtc = (iso: string) => (/[zZ]$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);

/**
 * The child's route, stop, bus and current position. Uses GET /api/transport/mine, the only transport endpoint a parent
 * login may call, so a family only ever sees its own children. Null if the child has no active transport.
 */
export async function getChildBusTracking(studentId: string): Promise<ChildBusTracking | null> {
  const rows = await unwrap(campusHttpClient.get<ApiMyTransport[]>("/api/transport/mine"));
  const row = rows.find((r) => r.studentId === studentId);
  if (!row) return null;
  return {
    ...row,
    stops: [...row.stops].sort((x, y) => x.sequence - y.sequence).map((st) => ({ ...st, landmark: st.landmark ?? undefined })),
    live: row.live ? { ...row.live, status: TRACKING_STATUS_FROM_API[row.live.status] ?? "idle", lastUpdated: asUtc(row.live.lastUpdated) } : null,
    source: SOURCE_FROM_API[row.source] ?? "mock",
    position: row.position ? { ...row.position, heading: row.position.heading ?? undefined, speedKmph: Math.round(row.position.speedKmph), recordedAt: asUtc(row.position.recordedAt) } : null,
  };
}

/** The bus (or buses) this login drives. Empty when the login is not set up as a driver: the server never lists another driver's bus. */
export async function getMyDriverBuses(): Promise<MyDriverBus[]> {
  return unwrap(campusHttpClient.get<MyDriverBus[]>("/api/buspositions/my-buses"));
}
