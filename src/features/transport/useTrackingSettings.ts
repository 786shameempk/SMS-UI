import { useQuery } from "@tanstack/react-query";
import { getTrackingSettings } from "./trackingApi";

export const TRACKING_SETTINGS_KEY = ["transport", "tracking-settings"] as const;

export function useTrackingSettings() {
  return useQuery({ queryKey: TRACKING_SETTINGS_KEY, queryFn: getTrackingSettings, staleTime: 60_000 });
}
