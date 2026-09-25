import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { reactToTalent, recordTalentView } from "./api";
import { ADMIN_ROLES, CREATOR_BLOCKED_ROLES, REVIEWER_ROLES } from "./constants";
import type { TalentCard, TalentReactionType } from "./types";

/** UI affordances only - the backend re-checks every one of these. */
export function useTalentRole() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  return {
    user,
    userId: user?.id,
    canCreate: !!role && !CREATOR_BLOCKED_ROLES.has(role),
    isReviewer: !!role && REVIEWER_ROLES.has(role),
    isAdmin: !!role && ADMIN_ROLES.has(role),
    creatorSubtitle: role === "student" ? "Student" : role === "teacher" ? "Teacher" : role ? role.charAt(0).toUpperCase() + role.slice(1) : undefined,
  };
}

/**
 * Records a view once per mount after real engagement: a dwell timer for pages without playable media,
 * or an explicit `trigger()` from a player after meaningful playback. The server additionally dedupes per
 * user per day and ignores the creator, so this never inflates counts.
 */
export function useMeaningfulView(talentId: string | undefined, enabled: boolean, dwellMs: number | null) {
  const queryClient = useQueryClient();
  const sent = useRef(false);

  const trigger = useCallback(() => {
    if (!talentId || !enabled || sent.current) return;
    sent.current = true;
    recordTalentView(talentId)
      .then((result) => {
        if (result.counted) void queryClient.invalidateQueries({ queryKey: ["talents"] });
      })
      .catch(() => {
        // A failed view ping must never disturb the viewer.
      });
  }, [talentId, enabled, queryClient]);

  useEffect(() => {
    sent.current = false;
  }, [talentId]);

  useEffect(() => {
    if (!enabled || dwellMs === null) return;
    const timer = window.setTimeout(trigger, dwellMs);
    return () => window.clearTimeout(timer);
  }, [enabled, dwellMs, trigger]);

  return trigger;
}

/** Optimistic reactions: the card updates instantly, then reconciles with the server's counts. */
export function useReaction(card: TalentCard) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (type: TalentReactionType | null) => reactToTalent(card.id, type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["talents"] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString();
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: days > 300 ? "numeric" : undefined });
}

export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
