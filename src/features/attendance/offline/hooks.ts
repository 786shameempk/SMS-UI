import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuthStore } from "@/store/authStore";
import { type QueuedRegister, isOpen, listQueue, subscribeQueue } from "./queue";
import { isPersistent } from "./storage";
import { onSynced, syncQueue } from "./sync";

const RETRY_EVERY_MS = 60_000;

/** The signed-in person's registers that are waiting, being sent, need a decision, or were refused (plus those sent in the last day). */
export function useAttendanceQueue() {
  const userId = useAuthStore((s) => s.user?.id);
  const [items, setItems] = useState<QueuedRegister[]>([]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    let live = true;
    const load = () =>
      void listQueue(userId).then((rows) => {
        if (live) setItems(rows);
      });
    load();
    const stop = subscribeQueue(load);
    return () => {
      live = false;
      stop();
    };
  }, [userId]);

  return useMemo(() => {
    const open = items.filter(isOpen);
    return {
      items,
      open,
      waiting: open.filter((o) => o.status === "pending" || o.status === "syncing").length,
      conflicts: open.filter((o) => o.status === "conflict").length,
      rejected: open.filter((o) => o.status === "rejected").length,
      persistent: isPersistent(),
    };
  }, [items]);
}

/**
 * Mounted once in the app shell: sends waiting registers when the browser comes back online, when the tab is shown
 * again, and every minute while something is waiting; then reloads what attendance screens show.
 */
export function useAttendanceSyncDriver() {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const userId = useAuthStore((s) => s.user?.id);
  const { waiting } = useAttendanceQueue();

  const run = useCallback(() => {
    if (navigator.onLine) void syncQueue();
  }, []);

  useEffect(() => {
    if (!userId) return;
    run();
    const onVisible = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, run]);

  useEffect(() => {
    if (online && userId) run();
  }, [online, userId, run]);

  useEffect(() => {
    if (!userId || waiting === 0) return;
    const timer = window.setInterval(run, RETRY_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [userId, waiting, run]);

  useEffect(
    () =>
      onSynced((summary) => {
        void queryClient.invalidateQueries({ queryKey: ["attendance"] });
        if (summary.synced > 0) toast.success(summary.synced === 1 ? "A saved register was sent to the school." : `${summary.synced} saved registers were sent to the school.`, { id: "attendance-synced" });
        if (summary.conflicts > 0) toast.error("A register was changed by someone else. Open Attendance to choose which version to keep.", { id: "attendance-conflict" });
        if (summary.rejected > 0) toast.error("A saved register was not accepted. Open Attendance for details.", { id: "attendance-rejected" });
      }),
    [queryClient],
  );
}
