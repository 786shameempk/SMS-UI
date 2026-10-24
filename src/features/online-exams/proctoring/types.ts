export type ProctoringMode = "Off" | "Basic" | "Webcam";

export type ProctoringEventType =
  | "ConsentGiven"
  | "DeviceCheckPassed"
  | "AttemptStarted"
  | "TabHidden"
  | "TabVisible"
  | "WindowBlur"
  | "FullscreenExit"
  | "FullscreenEnter"
  | "CameraStopped"
  | "CameraStarted"
  | "CameraUnavailable"
  | "CopyAttempt"
  | "PasteAttempt"
  | "ContextMenu"
  | "Inactivity"
  | "NetworkOffline"
  | "NetworkOnline"
  | "MultipleScreens"
  | "Snapshot"
  | "WarningShown"
  | "AutoSubmitted";

export type ProctoringSeverity = "Info" | "Warning" | "Incident";
export type ReviewOutcome = "None" | "Flagged" | "Cleared" | "Warning" | "Misconduct";
export type AppealStatus = "None" | "Open" | "Upheld" | "Rejected";

/** What the exam page must observe for this attempt (on the attempt session). */
export interface AttemptProctoring {
  mode: ProctoringMode;
  requireFullscreen: boolean;
  warningThreshold: number;
  autoSubmitAfterIncidents: number;
  snapshotIntervalSeconds: number;
}

export interface ProctoringSetup {
  mode: ProctoringMode;
  noticeVersion: string;
  notice: string[];
  requireFullscreen: boolean;
  warningThreshold: number;
  autoSubmitAfterIncidents: number;
  snapshotIntervalSeconds: number;
  consentGiven: boolean;
  consentGivenAt: string | null;
}

export interface ProctoringEventInput {
  sequence: number;
  type: ProctoringEventType;
  occurredAt: string | null;
  detail: string | null;
}

export interface ProctoringStatus {
  incidents: number;
  warnings: number;
  flagged: boolean;
  autoSubmitted: boolean;
  message: string | null;
}

export interface ProctoringCandidate {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  attemptId: string | null;
  state: "NotStarted" | "InProgress" | "Submitted" | "TimedOut";
  online: boolean;
  lastSeenAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  incidents: number;
  warnings: number;
  outcome: ReviewOutcome;
  appealStatus: AppealStatus;
  lastEvent: string | null;
  consentGiven: boolean;
}

export interface ProctoringMonitor {
  examId: string;
  examName: string;
  mode: ProctoringMode;
  startUtc: string;
  endUtc: string;
  assigned: number;
  inProgress: number;
  submitted: number;
  notStarted: number;
  flagged: number;
  candidates: ProctoringCandidate[];
}

export interface ProctoringReview {
  outcome: ReviewOutcome;
  reviewNote: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  appealStatus: AppealStatus;
  appealText: string | null;
  appealedAt: string | null;
  appealDecisionNote: string | null;
  appealDecidedAt: string | null;
  incidents: number;
  warnings: number;
  autoSubmitted: boolean;
}

export interface ProctoringEvent {
  id: string;
  type: ProctoringEventType;
  severity: ProctoringSeverity;
  occurredAt: string;
  receivedAt: string;
  detail: string | null;
  hasSnapshot: boolean;
}

export interface ProctoringTimeline {
  attemptId: string;
  studentName: string;
  consentGivenAt: string | null;
  browser: string | null;
  cameraAvailable: boolean;
  review: ProctoringReview;
  events: ProctoringEvent[];
}
