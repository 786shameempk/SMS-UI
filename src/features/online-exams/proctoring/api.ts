import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  ProctoringEventInput,
  ProctoringMonitor,
  ProctoringReview,
  ProctoringSetup,
  ProctoringStatus,
  ProctoringTimeline,
  ReviewOutcome,
} from "./types";

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Student

export const getProctoringSetup = (examId: string) => unwrap(academicHttpClient.get<ProctoringSetup>(`/api/online-exams/${examId}/proctoring`));

export const giveProctoringConsent = (examId: string, input: { noticeVersion: string; cameraAvailable: boolean; fullscreenAvailable: boolean; browser: string }) =>
  unwrap(academicHttpClient.post<ProctoringSetup>(`/api/online-exams/${examId}/proctoring/consent`, input));

/** Also the heartbeat when the batch is empty. Errors propagate so the caller keeps the batch for the next try. */
export const reportProctoringEvents = async (examId: string, events: ProctoringEventInput[]) =>
  (await academicHttpClient.post<ProctoringStatus>(`/api/online-exams/${examId}/proctoring/events`, { events })).data;

export const uploadProctoringSnapshot = async (examId: string, image: Blob) => {
  const form = new FormData();
  form.append("image", image, "snapshot.jpg");
  await academicHttpClient.post(`/api/online-exams/${examId}/proctoring/snapshot`, form);
};

export const getMyProctoringReview = (examId: string) =>
  unwrap(academicHttpClient.get<ProctoringReview | null>(`/api/online-exams/${examId}/proctoring/my-review`));

export const appealProctoringDecision = (examId: string, text: string) =>
  unwrap(academicHttpClient.post<ProctoringReview>(`/api/online-exams/${examId}/proctoring/appeal`, { text }));

// ── Invigilator

export const getProctoringMonitor = (examId: string) => unwrap(academicHttpClient.get<ProctoringMonitor>(`/api/online-exams/${examId}/monitor`));

export const getProctoringTimeline = (examId: string, attemptId: string) =>
  unwrap(academicHttpClient.get<ProctoringTimeline>(`/api/online-exams/${examId}/attempts/${attemptId}/proctoring`));

/** Snapshots need the bearer token, so they are fetched as blobs and shown through object URLs. */
export const getProctoringSnapshot = async (examId: string, attemptId: string, eventId: string) =>
  unwrap(
    academicHttpClient.get<Blob>(`/api/online-exams/${examId}/attempts/${attemptId}/proctoring/snapshots/${eventId}`, { responseType: "blob" }),
  );

export const decideProctoringReview = (examId: string, attemptId: string, outcome: ReviewOutcome, note?: string) =>
  unwrap(academicHttpClient.post<ProctoringReview>(`/api/online-exams/${examId}/attempts/${attemptId}/proctoring/review`, { outcome, note: note ?? null }));

export const decideProctoringAppeal = (examId: string, attemptId: string, upheld: boolean, note: string) =>
  unwrap(academicHttpClient.post<ProctoringReview>(`/api/online-exams/${examId}/attempts/${attemptId}/proctoring/appeal-decision`, { upheld, note }));
