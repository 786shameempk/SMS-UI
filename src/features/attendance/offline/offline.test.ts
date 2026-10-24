import { academicHttpClient } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { apiError, signIn, signOut, stubClient } from "@/test/utils";
import { AttendanceConflictError, NetworkUnavailableError, SaveRejectedError, saveAttendance } from "../api";
import { readCached, withDeviceFallback, writeCached } from "./cache";
import { enqueueRegister, listQueue, purgeQueue, resetQueueListenersForTests } from "./queue";
import { startOfflinePurge } from "./purge";
import { resetStorageForTests } from "./storage";
import { resolveConflict, retryOperation, syncQueue } from "./sync";

const networkError = () => Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK" });
const record = (studentId: string, status: string) => ({
  id: studentId, tenantId: "t", branchId: "b", studentId, sectionId: "s1", date: "2026-10-23", status, captureMode: "Manual", remarks: null, markedAt: "2026-10-23T08:00:00Z",
});

let userId: string;
const register = (overrides: Partial<Parameters<typeof enqueueRegister>[0]> = {}) =>
  enqueueRegister({
    userId, tenantId: "tenant-educore", branchId: "tenant-educore-main", sectionId: "s1", date: "2026-10-23", label: "Grade 6 · A",
    entries: [{ studentId: "st1", status: "absent" }], baseVersion: "t1", ...overrides,
  });

beforeEach(() => {
  resetStorageForTests();
  resetQueueListenersForTests();
  userId = signIn("teacher").id;
});
afterEach(() => signOut());

describe("saving a register", () => {
  it("sends the operation id, base version and the school it belongs to, and nothing extra for a plain save", async () => {
    const calls = stubClient(academicHttpClient, { "POST /api/attendance": [record("st1", "Present")] });

    await saveAttendance({ sectionId: "s1", date: "2026-10-23", captureMode: "manual", entries: [{ studentId: "st1", status: "present" }] });
    await saveAttendance({
      sectionId: "s1", date: "2026-10-23", captureMode: "manual", entries: [], operationId: "op-1", baseVersion: "t5", force: true, tenantId: "ten", branchId: "br",
    });

    expect(calls[0].body).toEqual({ sectionId: "s1", date: "2026-10-23", captureMode: "Manual", entries: [{ studentId: "st1", status: "Present", remarks: null }] });
    expect(calls[1].body).toMatchObject({ operationId: "op-1", baseVersion: "t5", force: true });
    expect((calls[1].config as { headers: Record<string, string> }).headers).toEqual({ "X-Tenant-Id": "ten", "X-Branch-Id": "br" });
  });

  it("tells apart an unreachable server, a clash, and a refusal", async () => {
    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw networkError(); } });
    await expect(saveAttendance({ sectionId: "s1", date: "d", captureMode: "manual", entries: [] })).rejects.toBeInstanceOf(NetworkUnavailableError);

    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw apiError(409, { title: "changed", status: 409, currentVersion: "t9", current: [record("st1", "Late")] }); } });
    const clash = await saveAttendance({ sectionId: "s1", date: "d", captureMode: "manual", entries: [] }).catch((e) => e);
    expect(clash).toBeInstanceOf(AttendanceConflictError);
    expect(clash).toMatchObject({ currentVersion: "t9", current: [{ studentId: "st1", status: "late" }] });

    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw apiError(409, { title: "Past days are locked for this branch." }); } });
    const locked = await saveAttendance({ sectionId: "s1", date: "d", captureMode: "manual", entries: [] }).catch((e) => e);
    expect(locked).toBeInstanceOf(SaveRejectedError);
    expect(locked).toMatchObject({ status: 409, message: "Past days are locked for this branch." });

    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw apiError(503); } });
    await expect(saveAttendance({ sectionId: "s1", date: "d", captureMode: "manual", entries: [] })).rejects.toBeInstanceOf(NetworkUnavailableError);
  });
});

describe("the queue", () => {
  it("replaces a register that was never sent, keeping its id and base version", async () => {
    const first = await register();
    const second = await register({ entries: [{ studentId: "st1", status: "late" }], baseVersion: "t2" });

    expect(second.operationId).toBe(first.operationId);
    expect(second.baseVersion).toBe("t1");
    expect(await listQueue(userId)).toHaveLength(1);
    expect((await listQueue(userId))[0].entries[0].status).toBe("late");
  });

  it("makes a separate operation, checked against the server first, when the earlier one may have arrived", async () => {
    const first = await register({ maybeSent: true });
    const second = await register({ entries: [{ studentId: "st1", status: "late" }] });

    expect(second.operationId).not.toBe(first.operationId);
    expect(second.baseVersion).toBeNull();
    expect(await listQueue(userId)).toHaveLength(2);
  });

  it("keeps each person's registers apart", async () => {
    await register();
    const other = signIn("teacher", { id: "someone-else" }).id;
    expect(await listQueue(other)).toHaveLength(0);
  });
});

describe("sending saved registers", () => {
  it("sends a waiting register once and marks it sent", async () => {
    const calls = stubClient(academicHttpClient, { "POST /api/attendance": [record("st1", "Absent")] });
    const op = await register();

    const first = await syncQueue();
    const second = await syncQueue();

    expect(first).toMatchObject({ synced: 1, waiting: 0 });
    expect(second.synced).toBe(0);
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(calls[0].body).toMatchObject({ operationId: op.operationId, baseVersion: "t1" });
    expect((await listQueue(userId))[0]).toMatchObject({ status: "synced", maybeSent: false });
  });

  it("stays waiting while the server cannot be reached, then goes through", async () => {
    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw networkError(); } });
    await register();
    await register({ sectionId: "s2", label: "Grade 6 · B" });

    const offline = await syncQueue();
    expect(offline).toMatchObject({ synced: 0, waiting: 2 });
    expect((await listQueue(userId)).map((o) => o.status)).toEqual(["pending", "pending"]);
    expect((await listQueue(userId))[0]).toMatchObject({ attempts: 1, maybeSent: true });

    stubClient(academicHttpClient, { "POST /api/attendance": [record("st1", "Absent")] });
    expect(await syncQueue()).toMatchObject({ synced: 2 });
  });

  it("looks up the register's version first for an operation that must be rebased", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/sections/s1/date/2026-10-23/register": { version: "t77", records: [] },
      "POST /api/attendance": [record("st1", "Absent")],
    });
    await register({ maybeSent: true });
    await register();
    // First one goes out with its own base version, the second looks the version up.
    await syncQueue();

    const posts = calls.filter((c) => c.method === "POST");
    expect(posts.map((p) => (p.body as { baseVersion: string }).baseVersion)).toEqual(["t1", "t77"]);
  });

  it("holds a register that someone else changed until the teacher chooses", async () => {
    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw apiError(409, { title: "x", currentVersion: "t9", current: [record("st1", "Present")] }); } });
    const op = await register();
    expect(await syncQueue()).toMatchObject({ conflicts: 1 });
    expect((await listQueue(userId))[0]).toMatchObject({ status: "conflict", conflict: { version: "t9" } });
    // A conflict is not retried on its own.
    expect(await syncQueue()).toMatchObject({ conflicts: 0, synced: 0 });

    const calls = stubClient(academicHttpClient, { "POST /api/attendance": [record("st1", "Absent")] });
    expect(await resolveConflict(op.operationId, "mine")).toBe("synced");
    expect(calls[0].body).toMatchObject({ force: true, operationId: op.operationId });
  });

  it("drops this device's version when the teacher keeps the school's", async () => {
    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw apiError(409, { title: "x", currentVersion: "t9", current: [] }); } });
    const op = await register();
    await syncQueue();

    await resolveConflict(op.operationId, "server");

    expect(await listQueue(userId)).toEqual([]);
  });

  it("keeps a refused register visible instead of retrying it forever", async () => {
    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw apiError(409, { title: "Past days are locked for this branch." }); } });
    const op = await register();

    expect(await syncQueue()).toMatchObject({ rejected: 1 });
    expect((await listQueue(userId))[0]).toMatchObject({ status: "rejected", error: "Past days are locked for this branch." });
    expect(await syncQueue()).toMatchObject({ rejected: 0 });

    stubClient(academicHttpClient, { "POST /api/attendance": [record("st1", "Absent")] });
    expect(await retryOperation(op.operationId)).toBe("synced");
  });

  it("gives up on repeated server errors after a few tries", async () => {
    stubClient(academicHttpClient, { "POST /api/attendance": () => { throw apiError(500, { title: "Boom" }); } });
    await register();

    for (let i = 0; i < 4; i += 1) expect(await syncQueue()).toMatchObject({ waiting: 1 });
    expect(await syncQueue()).toMatchObject({ rejected: 1 });
  });

  it("does nothing when nobody is signed in", async () => {
    const calls = stubClient(academicHttpClient, { "POST /api/attendance": [] });
    await register();
    signOut();

    expect(await syncQueue()).toEqual({ synced: 0, conflicts: 0, rejected: 0, waiting: 0 });
    expect(calls).toHaveLength(0);
  });
});

describe("saved answers", () => {
  it("serves the saved copy only when the server could not be reached", async () => {
    await writeCached("roster:s1", ["old"]);

    const online = await withDeviceFallback("roster:s1", async () => ["fresh"]);
    expect(online).toEqual({ value: ["fresh"] });
    expect((await readCached<string[]>("roster:s1"))?.value).toEqual(["fresh"]);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const offline = await withDeviceFallback("roster:s1", async () => {
      throw new Error("We can't reach the server right now.");
    });
    expect(offline.value).toEqual(["fresh"]);
    expect(offline.fromDevice).toBeTypeOf("number");
    vi.restoreAllMocks();

    // A refusal while online is not replaced by old data.
    await expect(withDeviceFallback("roster:s1", async () => { throw new Error("You don't have permission."); })).rejects.toThrow("permission");
  });

  it("does not keep anything for nobody", async () => {
    signOut();
    await writeCached("k", 1);
    signIn("teacher");
    expect(await readCached("k")).toBeUndefined();
  });
});

describe("signing out", () => {
  it("removes saved names and, for a deliberate sign-out, the waiting registers; an expired session keeps the registers", async () => {
    const stop = startOfflinePurge();
    await writeCached("roster:s1", ["names"]);
    await register();

    useAuthStore.getState().clearAuth("expired");
    await new Promise((r) => setTimeout(r, 10));
    userId = signIn("teacher", { id: userId }).id;
    expect(await readCached("roster:s1")).toBeUndefined();
    expect(await listQueue(userId)).toHaveLength(1);

    useAuthStore.getState().clearAuth();
    await new Promise((r) => setTimeout(r, 10));
    signIn("teacher", { id: userId });
    expect(await listQueue(userId)).toHaveLength(0);
    stop();
  });

  it("purgeQueue without an id empties everything", async () => {
    await register();
    await purgeQueue();
    expect(await listQueue(userId)).toEqual([]);
  });
});
