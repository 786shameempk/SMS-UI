import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import { changePassword, listDevices, listSessions, revokeDevice, revokeSession } from "../api";
import type { DeviceRecord, SessionRecord } from "../types";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function ChangePasswordTab() {
  const email = useAuthStore((s) => s.user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setSubmitting(true);
    try {
      const { message } = await changePassword(email, values.currentPassword, values.newPassword);
      toast.success(message);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Choose a strong password you don&apos;t use elsewhere.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-xs text-red-600">{errors.currentPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
            {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SessionsTab() {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useQuery({ queryKey: ["auth", "sessions"], queryFn: listSessions });
  const revokeMutation = useMutation({
    mutationFn: (session: SessionRecord) => revokeSession(session.id),
    onSuccess: (_res, session) => {
      toast.success(`Signed out on ${session.device}`);
      queryClient.setQueryData<SessionRecord[]>(["auth", "sessions"], (prev) =>
        (prev ?? []).filter((s) => s.id !== session.id),
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>Everywhere you&apos;re currently signed in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading sessions…</p>}
        {sessions?.map((session) => (
          <div key={session.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Monitor className="w-4 h-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{session.browser}</p>
                  {session.isCurrent && <Badge variant="success">Current</Badge>}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {session.location} &middot; {session.ipAddress} &middot; last active{" "}
                  {new Date(session.lastActiveAt).toLocaleString()}
                </p>
              </div>
            </div>
            {!session.isCurrent && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => revokeMutation.mutate(session)}
                disabled={revokeMutation.isPending}
              >
                Sign out
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const DEVICE_ICONS = { desktop: Laptop, mobile: Smartphone, tablet: Tablet } as const;

function DevicesTab() {
  const queryClient = useQueryClient();
  const { data: devices, isLoading } = useQuery({ queryKey: ["auth", "devices"], queryFn: listDevices });
  const revokeMutation = useMutation({
    mutationFn: (device: DeviceRecord) => revokeDevice(device.id),
    onSuccess: (_res, device) => {
      toast.success(`${device.name} removed`);
      queryClient.setQueryData<DeviceRecord[]>(["auth", "devices"], (prev) => (prev ?? []).filter((d) => d.id !== device.id));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trusted devices</CardTitle>
        <CardDescription>Devices that can skip two-factor verification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading devices…</p>}
        {devices?.map((device) => {
          const Icon = DEVICE_ICONS[device.type];
          return (
            <div key={device.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{device.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {device.os} &middot; last used {new Date(device.lastUsedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => revokeMutation.mutate(device)}
                disabled={revokeMutation.isPending}
              >
                Remove
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function SecuritySettingsPage() {
  return (
    <div className="p-6 max-w-3xl space-y-1">
      <h1 className="text-xl font-bold text-slate-900">Security</h1>
      <p className="text-sm text-slate-500 mb-5">Manage your password, sessions, and trusted devices.</p>

      <Tabs defaultValue="password">
        <TabsList>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>
        <TabsContent value="password">
          <ChangePasswordTab />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="devices">
          <DevicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
