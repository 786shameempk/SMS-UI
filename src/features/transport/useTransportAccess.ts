import { useAuthStore } from "@/store/authStore";

export interface TransportAccess {
  /** The office view: routes, buses, drivers, assignments, live tracking and setup. */
  office: boolean;
  /** May share a trip from this device (the driver's own bus). */
  drive: boolean;
}

/**
 * What the signed-in user may do in Transport, from the staff actions in their session. A session from before staff
 * actions existed (no "Staff.Managed" marker) is judged by the module alone, as the server does, so nothing changes
 * until the user next signs in.
 */
export function useTransportAccess(): TransportAccess {
  const permissions = useAuthStore((s) => s.modulePermissions);
  if (!permissions?.transport) return { office: false, drive: false };
  const managed = Boolean(permissions["Staff.Managed"]);
  return {
    office: managed ? Boolean(permissions["Transport.Manage"]) : true,
    drive: managed ? Boolean(permissions["Transport.DriveTrip"]) : true,
  };
}
