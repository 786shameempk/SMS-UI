import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import type { DeviceRecord, SessionRecord } from "@/features/authentication/types";
import { listUserDevices, listUserSessions, revokeUserDevice, revokeUserSession } from "../api";
import type { SystemUser } from "../types";

const DEVICE_ICONS = { desktop: Laptop, mobile: Smartphone, tablet: Tablet } as const;

export default function SessionsTab({ user }: { user: SystemUser }) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["admin", "users", user.id, "sessions"],
    queryFn: () => listUserSessions(user.id),
  });
  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ["admin", "users", user.id, "devices"],
    queryFn: () => listUserDevices(user.id),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (session: SessionRecord) => revokeUserSession(user.id, session.id),
    onSuccess: (_res, session) => {
      toast.success(`Signed out on ${session.device}`);
      queryClient.setQueryData<SessionRecord[]>(["admin", "users", user.id, "sessions"], (prev) =>
        (prev ?? []).filter((s) => s.id !== session.id),
      );
    },
  });

  const revokeDeviceMutation = useMutation({
    mutationFn: (device: DeviceRecord) => revokeUserDevice(user.id, device.id),
    onSuccess: (_res, device) => {
      toast.success(`${device.name} removed`);
      queryClient.setQueryData<DeviceRecord[]>(["admin", "users", user.id, "devices"], (prev) =>
        (prev ?? []).filter((d) => d.id !== device.id),
      );
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Active sessions</p>
        <div className="space-y-2">
          {sessionsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!sessionsLoading && sessions.length === 0 && <p className="text-sm text-muted-foreground">No active sessions.</p>}
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{session.browser}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.location} &middot; last active {new Date(session.lastActiveAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => revokeSessionMutation.mutate(session)}
                disabled={revokeSessionMutation.isPending}
              >
                Sign out
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-2">Trusted devices</p>
        <div className="space-y-2">
          {devicesLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!devicesLoading && devices.length === 0 && <p className="text-sm text-muted-foreground">No trusted devices.</p>}
          {devices.map((device) => {
            const Icon = DEVICE_ICONS[device.type];
            return (
              <div key={device.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{device.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {device.os} &middot; last used {new Date(device.lastUsedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => revokeDeviceMutation.mutate(device)}
                  disabled={revokeDeviceMutation.isPending}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
