import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("authentication");
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
      toast.error(err instanceof Error ? err.message : t("Could not update password"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Change password")}</CardTitle>
        <CardDescription>{t("Choose a strong password you don't use elsewhere.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">{t("Current password")}</Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" aria-invalid={errors.currentPassword ? true : undefined} {...register("currentPassword")} />
            {errors.currentPassword && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.currentPassword.message ?? "")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{t("New password")}</Label>
            <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={errors.newPassword ? true : undefined} {...register("newPassword")} />
            {errors.newPassword && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.newPassword.message ?? "")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">{t("Confirm new password")}</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={errors.confirmPassword ? true : undefined} {...register("confirmPassword")} />
            {errors.confirmPassword && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{t(errors.confirmPassword.message ?? "")}</p>}
          </div>
          <Button type="submit" loading={submitting}>
            {t("Update password")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SessionsTab() {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useQuery({ queryKey: ["auth", "sessions"], queryFn: listSessions });
  const { t } = useTranslation("authentication");
  const revokeMutation = useMutation({
    mutationFn: (session: SessionRecord) => revokeSession(session.id),
    onSuccess: (_res, session) => {
      toast.success(t("Signed out on {{device}}", { device: session.device }));
      queryClient.setQueryData<SessionRecord[]>(["auth", "sessions"], (prev) =>
        (prev ?? []).filter((s) => s.id !== session.id),
      );
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Active sessions")}</CardTitle>
        <CardDescription>{t("Everywhere you're currently signed in.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">{t("Loading sessions…")}</p>}
        {sessions?.map((session) => (
          <div key={session.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Monitor className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{session.browser}</p>
                  {session.isCurrent && <Badge variant="success">{t("Current")}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {session.location} &middot; {session.ipAddress} &middot;{" "}
                  {t("last active {{time}}", { time: new Date(session.lastActiveAt).toLocaleString() })}
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
                {t("Sign out")}
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
  const { t } = useTranslation("authentication");
  const revokeMutation = useMutation({
    mutationFn: (device: DeviceRecord) => revokeDevice(device.id),
    onSuccess: (_res, device) => {
      toast.success(t("{{device}} removed", { device: device.name }));
      queryClient.setQueryData<DeviceRecord[]>(["auth", "devices"], (prev) => (prev ?? []).filter((d) => d.id !== device.id));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Trusted devices")}</CardTitle>
        <CardDescription>{t("Devices that can skip two-factor verification.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">{t("Loading devices…")}</p>}
        {devices?.map((device) => {
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
                    {device.os} &middot; {t("last used {{time}}", { time: new Date(device.lastUsedAt).toLocaleString() })}
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
                {t("Remove")}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function SecuritySettingsPage() {
  const { t } = useTranslation("authentication");
  return (
    <PageContainer>
      <PageHeader title={t("Security")} description={t("Manage your password, sessions, and trusted devices.")} />

      <Tabs defaultValue="password">
        <TabsList>
          <TabsTrigger value="password">{t("Password")}</TabsTrigger>
          <TabsTrigger value="sessions">{t("Sessions")}</TabsTrigger>
          <TabsTrigger value="devices">{t("Devices")}</TabsTrigger>
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
    </PageContainer>
  );
}
