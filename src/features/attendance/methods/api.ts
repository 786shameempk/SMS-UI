import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  AttendanceCredential,
  AttendanceDevice,
  AttendanceExceptions,
  AttendanceMethodSettings,
  AttendancePass,
  AuditEntry,
  Correction,
  CorrectionStatus,
  CredentialKind,
  DeviceInput,
  DeviceWithKey,
  FaceConsent,
  FaceOutcome,
  MethodStatus,
  PersonType,
  ScanDirection,
  ScanEvent,
  ScanEventFilters,
  ScanOutcome,
  ScanSession,
} from "./types";

// AcademicService enums are PascalCase ("FaceKiosk", "PendingReview"); the UI uses camelCase ("faceKiosk").
export const fromApiEnum = <T extends string>(value: string | null | undefined): T =>
  (value ? value.charAt(0).toLowerCase() + value.slice(1) : value) as T;
export const toApiEnum = (value: string | null | undefined): string | null | undefined =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/** "09:15:00" -> "09:15"; the form uses <input type="time">. */
const fromApiTime = (value: string | null | undefined): string | null => (value ? value.slice(0, 5) : null);
const toApiTime = (value: string | null | undefined): string | null => (value ? (value.length === 5 ? `${value}:00` : value) : null);

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

type Raw = Record<string, unknown>;

const mapDevice = (d: Raw): AttendanceDevice => ({
  ...(d as unknown as AttendanceDevice),
  kind: fromApiEnum(d.kind as string),
  status: fromApiEnum(d.status as string),
  defaultDirection: fromApiEnum(d.defaultDirection as string),
});

const mapScan = (s: Raw): ScanOutcome => ({
  ...(s as unknown as ScanOutcome),
  result: fromApiEnum(s.result as string),
  personType: s.personType ? fromApiEnum(s.personType as string) : null,
  direction: fromApiEnum(s.direction as string),
});

const mapEvent = (e: Raw): ScanEvent => ({
  ...(e as unknown as ScanEvent),
  source: fromApiEnum(e.source as string),
  result: fromApiEnum(e.result as string),
  personType: e.personType ? fromApiEnum(e.personType as string) : null,
  direction: fromApiEnum(e.direction as string),
  reviewDecision: e.reviewDecision ? fromApiEnum(e.reviewDecision as string) : null,
});

const mapSession = (s: Raw): ScanSession => ({
  ...(s as unknown as ScanSession),
  audience: fromApiEnum(s.audience as string),
  status: fromApiEnum(s.status as string),
  direction: fromApiEnum(s.direction as string),
});

const mapCredential = (c: Raw): AttendanceCredential => ({
  ...(c as unknown as AttendanceCredential),
  personType: fromApiEnum(c.personType as string),
  kind: fromApiEnum(c.kind as string),
});

const mapCorrection = (c: Raw): Correction => ({
  ...(c as unknown as Correction),
  personType: fromApiEnum(c.personType as string),
  status: fromApiEnum(c.status as string),
});

const mapConsent = (c: Raw): FaceConsent => ({
  ...(c as unknown as FaceConsent),
  personType: fromApiEnum(c.personType as string),
  status: fromApiEnum(c.status as string),
});

const mapSettings = (s: Raw): AttendanceMethodSettings => ({
  ...(s as unknown as AttendanceMethodSettings),
  studentLateAfter: fromApiTime(s.studentLateAfter as string | null),
  staffLateAfter: fromApiTime(s.staffLateAfter as string | null),
});

// ── Settings and status ─────────────────────────────────────────────────

export async function getMethodSettings(): Promise<AttendanceMethodSettings> {
  return mapSettings(await unwrap(academicHttpClient.get<Raw>("/api/attendance/methods/settings")));
}

export async function updateMethodSettings(settings: AttendanceMethodSettings): Promise<AttendanceMethodSettings> {
  return mapSettings(
    await unwrap(
      academicHttpClient.put<Raw>("/api/attendance/methods/settings", {
        ...settings,
        studentLateAfter: toApiTime(settings.studentLateAfter),
        staffLateAfter: toApiTime(settings.staffLateAfter),
      }),
    ),
  );
}

export async function getMethodStatus(): Promise<MethodStatus[]> {
  return unwrap(academicHttpClient.get<MethodStatus[]>("/api/attendance/methods/status"));
}

// ── Devices ─────────────────────────────────────────────────────────────

export async function listDevices(): Promise<AttendanceDevice[]> {
  return (await unwrap(academicHttpClient.get<Raw[]>("/api/attendance/devices"))).map(mapDevice);
}

const deviceBody = (input: DeviceInput) => ({
  name: input.name,
  kind: toApiEnum(input.kind),
  location: input.location || null,
  serialNumber: input.serialNumber || null,
  vendor: input.vendor || null,
  defaultDirection: toApiEnum(input.defaultDirection),
  status: toApiEnum(input.status ?? "active"),
});

export async function registerDevice(input: DeviceInput): Promise<DeviceWithKey> {
  const created = await unwrap(academicHttpClient.post<{ device: Raw; deviceKey: string }>("/api/attendance/devices", deviceBody(input)));
  return { device: mapDevice(created.device), deviceKey: created.deviceKey };
}

export async function updateDevice(id: string, input: DeviceInput): Promise<AttendanceDevice> {
  return mapDevice(await unwrap(academicHttpClient.put<Raw>(`/api/attendance/devices/${id}`, deviceBody(input))));
}

export async function rotateDeviceKey(id: string): Promise<DeviceWithKey> {
  const rotated = await unwrap(academicHttpClient.post<{ device: Raw; deviceKey: string }>(`/api/attendance/devices/${id}/rotate-key`));
  return { device: mapDevice(rotated.device), deviceKey: rotated.deviceKey };
}

export async function deleteDevice(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/attendance/devices/${id}`));
}

// ── Cards and terminal ids ──────────────────────────────────────────────

export async function listCredentials(filters?: { personType?: PersonType; personId?: string; includeRevoked?: boolean }): Promise<AttendanceCredential[]> {
  const rows = await unwrap(
    academicHttpClient.get<Raw[]>("/api/attendance/credentials", {
      params: { personType: toApiEnum(filters?.personType), personId: filters?.personId, includeRevoked: filters?.includeRevoked },
    }),
  );
  return rows.map(mapCredential);
}

export async function assignCredential(input: {
  personType: PersonType;
  personId: string;
  kind: CredentialKind;
  identifier: string;
}): Promise<AttendanceCredential> {
  return mapCredential(
    await unwrap(
      academicHttpClient.post<Raw>("/api/attendance/credentials", {
        personType: toApiEnum(input.personType),
        personId: input.personId,
        kind: toApiEnum(input.kind),
        identifier: input.identifier,
      }),
    ),
  );
}

export async function revokeCredential(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/attendance/credentials/${id}`));
}

// ── QR passes and sessions ──────────────────────────────────────────────

export async function getMyPass(): Promise<AttendancePass> {
  const pass = await unwrap(academicHttpClient.get<Raw>("/api/attendance/qr/my-pass"));
  return { ...(pass as unknown as AttendancePass), personType: fromApiEnum(pass.personType as string) };
}

export async function listScanSessions(date?: string): Promise<ScanSession[]> {
  return (await unwrap(academicHttpClient.get<Raw[]>("/api/attendance/qr/sessions", { params: { date } }))).map(mapSession);
}

export async function openScanSession(input: {
  audience: PersonType;
  sectionId?: string | null;
  durationMinutes: number;
  direction: ScanDirection;
}): Promise<ScanSession> {
  return mapSession(
    await unwrap(
      academicHttpClient.post<Raw>("/api/attendance/qr/sessions", {
        audience: toApiEnum(input.audience),
        sectionId: input.sectionId ?? null,
        durationMinutes: input.durationMinutes,
        direction: toApiEnum(input.direction),
      }),
    ),
  );
}

export async function getScanSession(id: string): Promise<ScanSession> {
  return mapSession(await unwrap(academicHttpClient.get<Raw>(`/api/attendance/qr/sessions/${id}`)));
}

export async function closeScanSession(id: string): Promise<ScanSession> {
  return mapSession(await unwrap(academicHttpClient.post<Raw>(`/api/attendance/qr/sessions/${id}/close`)));
}

export async function scanPass(sessionId: string, token: string): Promise<ScanOutcome> {
  return mapScan(await unwrap(academicHttpClient.post<Raw>(`/api/attendance/qr/sessions/${sessionId}/scan`, { token })));
}

export async function recognizeFaceInSession(sessionId: string, image: Blob): Promise<FaceOutcome> {
  const form = new FormData();
  form.append("image", image, "frame.jpg");
  const result = await unwrap(academicHttpClient.post<Raw>(`/api/attendance/qr/sessions/${sessionId}/face`, form));
  return { ...(result as unknown as FaceOutcome), scan: mapScan(result.scan as Raw) };
}

// ── Face consent and enrolment ──────────────────────────────────────────

export async function listFaceConsents(personType?: PersonType): Promise<FaceConsent[]> {
  return (
    await unwrap(academicHttpClient.get<Raw[]>("/api/attendance/face/consents", { params: { personType: toApiEnum(personType) } }))
  ).map(mapConsent);
}

export async function grantFaceConsent(input: { personType: PersonType; personId: string; givenBy: string; method: string }): Promise<FaceConsent> {
  return mapConsent(
    await unwrap(
      academicHttpClient.post<Raw>("/api/attendance/face/consents", {
        personType: toApiEnum(input.personType),
        personId: input.personId,
        givenBy: input.givenBy,
        method: input.method,
        noticeVersion: null,
      }),
    ),
  );
}

export async function withdrawFaceConsent(id: string, reason?: string): Promise<FaceConsent> {
  return mapConsent(await unwrap(academicHttpClient.post<Raw>(`/api/attendance/face/consents/${id}/withdraw`, { reason: reason ?? null })));
}

export async function enrollFace(personType: PersonType, personId: string, image: Blob): Promise<FaceConsent> {
  const form = new FormData();
  form.append("personType", toApiEnum(personType) as string);
  form.append("personId", personId);
  form.append("image", image, "face.jpg");
  return mapConsent(await unwrap(academicHttpClient.post<Raw>("/api/attendance/face/enrollments", form)));
}

export async function deleteFaceEnrollment(personType: PersonType, personId: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/attendance/face/enrollments/${toApiEnum(personType)}/${personId}`));
}

export async function listMyChildrenFaceConsents(): Promise<FaceConsent[]> {
  return (await unwrap(academicHttpClient.get<Raw[]>("/api/attendance/face/my-children"))).map(mapConsent);
}

export async function grantFaceConsentForChild(studentId: string): Promise<FaceConsent> {
  return mapConsent(await unwrap(academicHttpClient.post<Raw>(`/api/attendance/face/my-children/${studentId}/grant`)));
}

export async function withdrawFaceConsentForChild(studentId: string): Promise<void> {
  await unwrap(academicHttpClient.post(`/api/attendance/face/my-children/${studentId}/withdraw`));
}

// ── Events, review, corrections, audit, exceptions ──────────────────────

export async function listScanEvents(filters: ScanEventFilters = {}): Promise<ScanEvent[]> {
  const rows = await unwrap(
    academicHttpClient.get<Raw[]>("/api/attendance/events", {
      params: {
        from: filters.from,
        to: filters.to,
        result: toApiEnum(filters.result),
        source: toApiEnum(filters.source),
        deviceId: filters.deviceId,
        personType: toApiEnum(filters.personType),
        personId: filters.personId,
        take: filters.take,
      },
    }),
  );
  return rows.map(mapEvent);
}

export async function reviewScanEvent(id: string, approve: boolean, note?: string): Promise<ScanEvent> {
  return mapEvent(await unwrap(academicHttpClient.post<Raw>(`/api/attendance/events/${id}/review`, { approve, note: note ?? null })));
}

export async function listCorrections(status?: CorrectionStatus): Promise<Correction[]> {
  return (await unwrap(academicHttpClient.get<Raw[]>("/api/attendance/corrections", { params: { status: toApiEnum(status) } }))).map(
    mapCorrection,
  );
}

export async function requestCorrection(input: {
  personType: PersonType;
  personId: string;
  date: string;
  requestedStatus: string;
  reason: string;
}): Promise<Correction> {
  return mapCorrection(
    await unwrap(academicHttpClient.post<Raw>("/api/attendance/corrections", { ...input, personType: toApiEnum(input.personType) })),
  );
}

export async function decideCorrection(id: string, approve: boolean, note?: string): Promise<Correction> {
  return mapCorrection(await unwrap(academicHttpClient.post<Raw>(`/api/attendance/corrections/${id}/decide`, { approve, note: note ?? null })));
}

export async function cancelCorrection(id: string): Promise<void> {
  await unwrap(academicHttpClient.post(`/api/attendance/corrections/${id}/cancel`));
}

export async function listAttendanceAudit(filters: { personType?: PersonType; personId?: string; from?: string; to?: string } = {}): Promise<AuditEntry[]> {
  const rows = await unwrap(
    academicHttpClient.get<Raw[]>("/api/attendance/audit", { params: { ...filters, personType: toApiEnum(filters.personType) } }),
  );
  return rows.map((a) => ({
    ...(a as unknown as AuditEntry),
    personType: fromApiEnum(a.personType as string),
    source: fromApiEnum(a.source as string),
  }));
}

export async function getAttendanceExceptions(date?: string): Promise<AttendanceExceptions> {
  const r = await unwrap(academicHttpClient.get<Raw>("/api/attendance/exceptions", { params: { date } }));
  const rows = (k: string) => ((r[k] as Raw[]) ?? []).map((x) => ({ ...x, personType: fromApiEnum(x.personType as string) }));
  return {
    ...(r as unknown as AttendanceExceptions),
    rejectedEvents: ((r.rejectedEvents as Raw[]) ?? []).map(mapEvent),
    pendingEvents: ((r.pendingEvents as Raw[]) ?? []).map(mapEvent),
    unknownIdentifiers: ((r.unknownIdentifiers as Raw[]) ?? []).map((u) => ({
      ...(u as unknown as AttendanceExceptions["unknownIdentifiers"][number]),
      source: fromApiEnum(u.source as string),
    })),
    scannedButAbsent: rows("scannedButAbsent") as unknown as AttendanceExceptions["scannedButAbsent"],
    presentWithoutScan: rows("presentWithoutScan") as unknown as AttendanceExceptions["presentWithoutScan"],
    staffNotCheckedOut: rows("staffNotCheckedOut") as unknown as AttendanceExceptions["staffNotCheckedOut"],
    offlineDevices: ((r.offlineDevices as Raw[]) ?? []).map(mapDevice),
  };
}
