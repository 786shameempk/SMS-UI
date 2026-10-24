export type PersonType = "student" | "staff";
export type DeviceKind = "rfid" | "biometric" | "faceKiosk";
export type DeviceStatus = "active" | "disabled";
export type CredentialKind = "rfid" | "biometric";
export type ScanDirection = "auto" | "in" | "out";
export type ScanResult = "accepted" | "duplicate" | "rejected" | "pendingReview";
export type SourceMode = "manual" | "qr" | "rfid" | "biometric" | "face" | "mobile";
export type CorrectionStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ConsentStatus = "granted" | "withdrawn";
export type MethodKey = "manual" | "qr" | "rfid" | "biometric" | "face";

export interface AttendanceMethodSettings {
  qrEnabled: boolean;
  rfidEnabled: boolean;
  biometricEnabled: boolean;
  faceEnabled: boolean;
  timeZoneId: string;
  /** "HH:mm" or null */
  studentLateAfter: string | null;
  staffLateAfter: string | null;
  qrPassLifetimeSeconds: number;
  duplicateWindowMinutes: number;
  faceMatchThreshold: number;
  faceReviewThreshold: number;
  scanEventRetentionDays: number;
  requireApprovalForPastEdits: boolean;
}

export interface MethodStatus {
  method: MethodKey;
  enabled: boolean;
  ready: boolean;
  message: string;
  activeDevices: number;
  onlineDevices: number;
}

export interface AttendanceDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  location: string | null;
  serialNumber: string | null;
  vendor: string | null;
  defaultDirection: ScanDirection;
  keyPrefix: string;
  status: DeviceStatus;
  online: boolean;
  lastSeenAt: string | null;
  lastSeenIp: string | null;
  firmwareVersion: string | null;
  lastEventAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  eventsToday: number;
  rejectedToday: number;
}

export interface DeviceInput {
  name: string;
  kind: DeviceKind;
  location?: string | null;
  serialNumber?: string | null;
  vendor?: string | null;
  defaultDirection: ScanDirection;
  status?: DeviceStatus;
}

export interface DeviceWithKey {
  device: AttendanceDevice;
  deviceKey: string;
}

export interface AttendanceCredential {
  id: string;
  personType: PersonType;
  personId: string;
  personName: string;
  kind: CredentialKind;
  label: string;
  active: boolean;
  createdAt: string;
  revokedAt: string | null;
}

export interface AttendancePass {
  token: string;
  expiresAt: string;
  lifetimeSeconds: number;
  personType: PersonType;
  personName: string;
}

export interface ScanSession {
  id: string;
  audience: PersonType;
  sectionId: string | null;
  sectionName: string | null;
  date: string;
  opensAt: string;
  closesAt: string;
  status: "open" | "closed";
  direction: ScanDirection;
  openedByName: string | null;
  accepted: number;
  rejected: number;
  expected: number;
}

export interface ScanOutcome {
  eventId: string;
  result: ScanResult;
  reason: string | null;
  personType: PersonType | null;
  personId: string | null;
  personName: string | null;
  attendanceStatus: string | null;
  direction: ScanDirection;
  date: string;
  occurredAt: string;
}

export interface FaceOutcome {
  scan: ScanOutcome;
  similarity: number | null;
  needsManualFallback: boolean;
}

export interface ScanEvent {
  id: string;
  source: SourceMode;
  deviceId: string | null;
  deviceName: string | null;
  qrSessionId: string | null;
  personType: PersonType | null;
  personId: string | null;
  personName: string | null;
  identifierLabel: string | null;
  direction: ScanDirection;
  occurredAt: string;
  receivedAt: string;
  attendanceDate: string;
  result: ScanResult;
  reason: string | null;
  confidence: number | null;
  reviewDecision: "approved" | "rejected" | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface Correction {
  id: string;
  personType: PersonType;
  personId: string;
  personName: string;
  sectionId: string | null;
  date: string;
  currentStatus: string | null;
  requestedStatus: string;
  reason: string;
  requestedByName: string | null;
  requestedAt: string;
  status: CorrectionStatus;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface AuditEntry {
  id: string;
  personType: PersonType;
  personId: string;
  personName: string | null;
  date: string;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  source: SourceMode;
  actorName: string | null;
  details: string | null;
  at: string;
}

export interface FaceConsent {
  id: string;
  personType: PersonType;
  personId: string;
  personName: string;
  status: ConsentStatus;
  givenBy: string;
  method: string;
  noticeVersion: string;
  grantedAt: string;
  recordedByName: string | null;
  withdrawnAt: string | null;
  withdrawnReason: string | null;
  enrolled: boolean;
  sampleCount: number;
}

export interface UnknownIdentifier {
  identifierLabel: string;
  source: SourceMode;
  deviceName: string | null;
  count: number;
  lastSeenAt: string;
}

export interface ReconciliationRow {
  personType: PersonType;
  personId: string;
  personName: string;
  detail: string | null;
}

export interface AttendanceExceptions {
  date: string;
  accepted: number;
  duplicates: number;
  rejected: number;
  pendingReview: number;
  rejectedEvents: ScanEvent[];
  pendingEvents: ScanEvent[];
  unknownIdentifiers: UnknownIdentifier[];
  scannedButAbsent: ReconciliationRow[];
  presentWithoutScan: ReconciliationRow[];
  staffNotCheckedOut: ReconciliationRow[];
  offlineDevices: AttendanceDevice[];
}

export interface ScanEventFilters {
  from?: string;
  to?: string;
  result?: ScanResult;
  source?: SourceMode;
  deviceId?: string;
  personType?: PersonType;
  personId?: string;
  take?: number;
}
