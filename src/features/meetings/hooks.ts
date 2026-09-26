import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { joinMeeting } from "./api";
import type { MeetingSummary } from "./types";

/** Query keys - every mutation invalidates the ["meetings"] prefix. */
export const meetingKeys = {
  all: ["meetings"] as const,
  today: ["meetings", "today"] as const,
  upcoming: ["meetings", "upcoming"] as const,
  list: (filters: object) => ["meetings", "list", filters] as const,
  calendar: (from: string, to: string) => ["meetings", "calendar", from, to] as const,
  detail: (id: string) => ["meetings", id] as const,
  part: (id: string, part: string) => ["meetings", id, part] as const,
};

/** UI affordances only - MeetingService re-checks every one of these. */
export function useMeetingRole() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isManager = role === "admin" || role === "superAdmin" || role === "principal";
  return {
    user,
    role,
    isManager,
    isAdmin: role === "admin" || role === "superAdmin",
    isTeacher: role === "teacher",
    isStudent: role === "student",
    isParent: role === "parent",
    canSchedule: isManager || role === "teacher",
    canSeeReports: isManager || role === "teacher",
  };
}

/** A clock that re-renders every `intervalMs` - drives countdowns without refetching. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Joinable right now by the clock (the server's canJoinNow can be up to a refetch interval stale). */
export function isJoinableNow(m: Pick<MeetingSummary, "status" | "opensAtUtc" | "endUtc" | "myRelation">, now: number) {
  if (!["Participant", "CoHost", "Host"].includes(m.myRelation)) return false;
  if (m.status === "Live") return true;
  return m.status === "Scheduled" && now >= Date.parse(m.opensAtUtc) && now <= Date.parse(m.endUtc);
}

/**
 * Join = ask MeetingService for a ticket (it checks access, status and time), then either open the
 * embedded room or the provider's own page. The ticket itself never goes into a URL.
 */
export function useJoinMeeting() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinMeeting,
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      if (ticket.mode === "External" && ticket.externalUrl) {
        window.open(ticket.externalUrl, "_blank", "noopener,noreferrer");
        return;
      }
      navigate(`/online-classes/${ticket.meetingId}/room`, { state: { ticket } });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
