import { useAuthStore } from "@/store/authStore";
import { AttendanceConflictError, NetworkUnavailableError, SaveRejectedError, getAttendanceRegister, saveAttendance } from "../api";
import { type QueuedRegister, getOperation, listQueue, pruneAbandoned, pruneSynced, removeOperation, saveOperation } from "./queue";

export interface SyncSummary {
  synced: number;
  conflicts: number;
  rejected: number;
  /** Still waiting because the server could not be reached or answered with an error worth retrying. */
  waiting: number;
}

const MAX_SERVER_ERROR_ATTEMPTS = 5;
const listeners = new Set<(summary: SyncSummary) => void>();

/** Told after a pass that sent something, so open screens can reload what they show. */
export function onSynced(listener: (summary: SyncSummary) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let running: Promise<SyncSummary> | null = null;

/**
 * Sends the signed-in person's waiting registers, oldest first, one at a time. Safe to call from anywhere and from
 * several tabs at once: one pass runs at a time per browser, and the server ignores a repeated operation id.
 */
export function syncQueue(): Promise<SyncSummary> {
  if (running) return running;
  const pass = withTabLock(runPass).finally(() => {
    running = null;
  });
  running = pass;
  return pass;
}

async function withTabLock(work: () => Promise<SyncSummary>): Promise<SyncSummary> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return work();
  const result = await locks.request("sms-attendance-sync", { ifAvailable: true }, (lock) => (lock ? work() : null));
  return result ?? { synced: 0, conflicts: 0, rejected: 0, waiting: 0 };
}

async function runPass(): Promise<SyncSummary> {
  const summary: SyncSummary = { synced: 0, conflicts: 0, rejected: 0, waiting: 0 };
  const userId = useAuthStore.getState().user?.id;
  if (!userId || !useAuthStore.getState().token) return summary;
  await pruneSynced(userId);
  await pruneAbandoned(userId);

  const waiting = (await listQueue(userId)).filter((o) => o.status === "pending" || o.status === "syncing");
  for (const [index, op] of waiting.entries()) {
    if (useAuthStore.getState().user?.id !== userId) break; // signed out or switched person mid-pass
    const outcome = await sendOne(op);
    if (outcome === "synced") summary.synced += 1;
    else if (outcome === "conflict") summary.conflicts += 1;
    else if (outcome === "rejected") summary.rejected += 1;
    else {
      // The server can't be reached: the rest would fail the same way.
      summary.waiting += waiting.length - index;
      break;
    }
  }
  if (summary.synced + summary.conflicts + summary.rejected > 0) listeners.forEach((l) => l(summary));
  return summary;
}

type Outcome = "synced" | "conflict" | "rejected" | "waiting";

async function sendOne(op: QueuedRegister, force = false): Promise<Outcome> {
  const attempt = { ...op, status: "syncing" as const, attempts: op.attempts + 1, maybeSent: true, error: undefined };
  await saveOperation(attempt);
  try {
    let baseVersion = op.baseVersion;
    if (baseVersion === null) baseVersion = (await getAttendanceRegister(op.sectionId, op.date)).version;
    await saveAttendance({
      sectionId: op.sectionId,
      date: op.date,
      captureMode: "manual",
      entries: op.entries,
      operationId: op.operationId,
      baseVersion,
      force,
      tenantId: op.tenantId,
      branchId: op.branchId,
    });
    await saveOperation({ ...attempt, status: "synced", maybeSent: false, syncedAt: Date.now(), conflict: undefined, baseVersion });
    return "synced";
  } catch (err) {
    if (err instanceof AttendanceConflictError) {
      await saveOperation({ ...attempt, status: "conflict", maybeSent: false, conflict: { version: err.currentVersion, current: err.current }, error: err.message });
      return "conflict";
    }
    if (err instanceof SaveRejectedError && err.status >= 500 && attempt.attempts < MAX_SERVER_ERROR_ATTEMPTS) {
      await saveOperation({ ...attempt, status: "pending", error: err.message });
      return "waiting";
    }
    if (err instanceof SaveRejectedError) {
      // A refused save (locked day, no access, bad data) will not succeed by repeating it; keep it so the teacher can see why.
      await saveOperation({ ...attempt, status: "rejected", maybeSent: false, error: err.message });
      return "rejected";
    }
    if (err instanceof NetworkUnavailableError) {
      // No answer: the register may or may not have arrived; the operation id makes sending it again safe.
      await saveOperation({ ...attempt, status: "pending" });
      return "waiting";
    }
    // Something else went wrong before the save (looking up the register's version): retry a few times, then give up visibly.
    const give = attempt.attempts >= MAX_SERVER_ERROR_ATTEMPTS;
    await saveOperation({ ...attempt, status: give ? "rejected" : "pending", maybeSent: false, error: (err as Error).message });
    return give ? "rejected" : "waiting";
  }
}

/** Tries a register that was refused or is waiting, now. */
export async function retryOperation(operationId: string): Promise<Outcome> {
  const op = await getOperation(operationId);
  if (!op) return "waiting";
  const outcome = await sendOne({ ...op, status: "pending", attempts: 0 });
  if (outcome !== "waiting") listeners.forEach((l) => l({ synced: +(outcome === "synced"), conflicts: +(outcome === "conflict"), rejected: +(outcome === "rejected"), waiting: 0 }));
  return outcome;
}

/** The teacher's choice for a register someone else changed: keep this device's version, or drop it for the saved one. */
export async function resolveConflict(operationId: string, keep: "mine" | "server"): Promise<Outcome> {
  const op = await getOperation(operationId);
  if (!op) return "waiting";
  if (keep === "server") {
    await removeOperation(operationId);
    listeners.forEach((l) => l({ synced: 0, conflicts: 0, rejected: 0, waiting: 0 }));
    return "synced";
  }
  const outcome = await sendOne({ ...op, status: "pending" }, true);
  listeners.forEach((l) => l({ synced: +(outcome === "synced"), conflicts: +(outcome === "conflict"), rejected: +(outcome === "rejected"), waiting: 0 }));
  return outcome;
}

export async function discardOperation(operationId: string): Promise<void> {
  await removeOperation(operationId);
}
