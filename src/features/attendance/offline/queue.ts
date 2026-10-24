import type { AttendanceRecord, MarkAttendanceEntry } from "../types";
import { table } from "./storage";

/**
 * Registers saved on this device while the server could not be reached. Each one is a single "operation" with its own
 * id, so sending it twice (a lost answer, two open tabs) never saves twice: the server remembers the id.
 *
 * pending    waiting to be sent
 * syncing    being sent right now
 * synced     the server has it (kept for a day so the teacher can see it arrived)
 * conflict   someone else changed the register meanwhile; the teacher chooses which version stays
 * rejected   the server refused it (locked day, no access...); the teacher can discard it
 */
export type OperationStatus = "pending" | "syncing" | "synced" | "conflict" | "rejected";

export interface QueuedRegister {
  operationId: string;
  userId: string;
  tenantId: string;
  branchId: string;
  sectionId: string;
  date: string;
  /** "Grade 6 · A", for the list; the real names are in the saved roster. */
  label: string;
  entries: MarkAttendanceEntry[];
  /** The register version these entries were edited from; null = look it up just before sending. */
  baseVersion: string | null;
  status: OperationStatus;
  attempts: number;
  /** A request was sent and no answer came back, so the server may already have it. */
  maybeSent: boolean;
  error?: string;
  conflict?: { version: string; current: AttendanceRecord[] };
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

const queue = table<QueuedRegister>("queue");
const SYNCED_KEPT_MS = 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("sms-attendance-queue");
channel?.addEventListener("message", () => listeners.forEach((l) => l()));

/** Called after every change, here and in other tabs. */
export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function changed() {
  listeners.forEach((l) => l());
  channel?.postMessage("changed");
}

export function newOperationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Older browsers without randomUUID: a v4-shaped id from getRandomValues.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function listQueue(userId: string): Promise<QueuedRegister[]> {
  const rows = await queue.all().catch(() => [] as QueuedRegister[]);
  return rows.filter((r) => r.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getOperation(operationId: string): Promise<QueuedRegister | undefined> {
  return queue.get(operationId).catch(() => undefined);
}

export async function saveOperation(op: QueuedRegister): Promise<void> {
  await queue.put(op.operationId, { ...op, updatedAt: Date.now() });
  changed();
}

export async function removeOperation(operationId: string): Promise<void> {
  await queue.delete(operationId).catch(() => undefined);
  changed();
}

export type NewRegister = Pick<QueuedRegister, "userId" | "tenantId" | "branchId" | "sectionId" | "date" | "label" | "entries"> & {
  /** Reuse an id already tried online, so a save whose answer was lost is not repeated as a second one. */
  operationId?: string;
  baseVersion: string | null;
  maybeSent?: boolean;
};

/**
 * Keeps a register for sending later. A second offline edit of the same class and day replaces the first when that one
 * was never sent; if it may already have reached the server, the second becomes its own operation that looks up the
 * register's version first (so it is checked against what the first one saved).
 */
export async function enqueueRegister(input: NewRegister): Promise<QueuedRegister> {
  const now = Date.now();
  const existing = (await listQueue(input.userId)).find(
    (o) => o.sectionId === input.sectionId && o.date === input.date && (o.status === "pending" || o.status === "conflict" || o.status === "rejected"),
  );
  if (existing && existing.status === "pending" && existing.maybeSent) {
    const op: QueuedRegister = { ...base(input, now), operationId: newOperationId(), baseVersion: null };
    await saveOperation(op);
    return op;
  }
  const op: QueuedRegister = existing
    ? { ...existing, entries: input.entries, label: input.label, status: "pending", error: undefined, conflict: undefined, maybeSent: input.maybeSent ?? false, updatedAt: now }
    : { ...base(input, now), operationId: input.operationId ?? newOperationId(), baseVersion: input.baseVersion };
  await saveOperation(op);
  return op;
}

function base(input: NewRegister, now: number): Omit<QueuedRegister, "operationId" | "baseVersion"> {
  return {
    userId: input.userId,
    tenantId: input.tenantId,
    branchId: input.branchId,
    sectionId: input.sectionId,
    date: input.date,
    label: input.label,
    entries: input.entries,
    status: "pending",
    attempts: 0,
    maybeSent: input.maybeSent ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Drops registers that arrived more than a day ago. */
export async function pruneSynced(userId: string): Promise<void> {
  const old = (await listQueue(userId)).filter((o) => o.status === "synced" && (o.syncedAt ?? 0) < Date.now() - SYNCED_KEPT_MS);
  await Promise.all(old.map((o) => queue.delete(o.operationId).catch(() => undefined)));
  if (old.length) changed();
}

/** Registers still to be sent or decided (not those that already arrived). */
export const isOpen = (o: QueuedRegister) => o.status !== "synced";

/** Removes one person's waiting registers (they signed out on purpose), or everyone's when no id is given. */
export async function purgeQueue(userId?: string): Promise<void> {
  if (!userId) {
    await queue.clear().catch(() => undefined);
  } else {
    const rows = await queue.all().catch(() => [] as QueuedRegister[]);
    await Promise.all(rows.filter((r) => r.userId === userId).map((r) => queue.delete(r.operationId).catch(() => undefined)));
  }
  changed();
}

const ABANDONED_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Registers of people who signed out without sending them are kept for a while in case they sign in again, but only
 * hold student ids and statuses, and are not kept for ever on a shared computer.
 */
export async function pruneAbandoned(currentUserId: string): Promise<void> {
  const rows = await queue.all().catch(() => [] as QueuedRegister[]);
  const old = rows.filter((r) => r.userId !== currentUserId && r.updatedAt < Date.now() - ABANDONED_AFTER_MS);
  await Promise.all(old.map((r) => queue.delete(r.operationId).catch(() => undefined)));
}

/** Test hook. */
export function resetQueueListenersForTests() {
  listeners.clear();
}
