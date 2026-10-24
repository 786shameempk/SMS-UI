import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { deleteDevice, listDevices, registerDevice, rotateDeviceKey, updateDevice } from "../../methods/api";
import { formatDateTime } from "../../methods/shared";
import type { AttendanceDevice, DeviceInput, DeviceKind, DeviceWithKey, ScanDirection } from "../../methods/types";

import { useTranslation } from "react-i18next";
const KIND_LABEL: Record<DeviceKind, string> = { rfid: "RFID reader", biometric: "Biometric terminal", faceKiosk: "Face kiosk" };

export default function DevicesPanel() {
  const { t } = useTranslation("attendance");
  const queryClient = useQueryClient();
  const devices = useQuery({ queryKey: ["attendance-methods", "devices"], queryFn: listDevices, refetchInterval: 30_000 });
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<DeviceWithKey | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["attendance-methods"] });

  const rotate = useMutation({
    mutationFn: rotateDeviceKey,
    onSuccess: (r) => {
      setIssued(r);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (d: AttendanceDevice) =>
      updateDevice(d.id, { ...d, status: d.status === "active" ? "disabled" : "active" } as DeviceInput),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      toast.success(t("Device removed"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{t("Devices")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("Card readers, biometric terminals and face kiosks. Each gets a secret key; a device shows as online once it has called in within 10 minutes.")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t("Register device")}
        </Button>
      </CardHeader>
      <CardContent>
        {devices.isError ? (
          <ErrorState bare onRetry={() => devices.refetch()} />
        ) : !devices.data?.length ? (
          <EmptyState bare title={t("No devices registered")} description={t("Register a reader or terminal, then configure it with the key shown once.")} />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {devices.data.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {d.name} <span className="text-xs font-normal text-muted-foreground">· {KIND_LABEL[d.kind]}{d.location ? ` · ${d.location}` : ""}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Key")} {d.keyPrefix}…{d.serialNumber ? t(" · Serial {{serialNumber}}", { serialNumber: d.serialNumber }) : ""} {t("· Last seen")} {formatDateTime(d.lastSeenAt)} · {d.eventsToday} {t("events today")}
                    {d.rejectedToday ? t(", {{rejectedToday}} refused", { rejectedToday: d.rejectedToday }) : ""}
                  </p>
                  {d.lastError && <p className="text-xs text-destructive">{t("Last error {{v1}}: {{lastError}}", { v1: formatDateTime(d.lastErrorAt), lastError: d.lastError })}</p>}
                </div>
                <Badge variant={d.status === "disabled" ? "neutral" : d.online ? "success" : "warning"}>
                  {d.status === "disabled" ? t("Disabled") : d.online ? t("Online") : t("Offline")}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => toggle.mutate(d)}>
                  {d.status === "active" ? t("Disable") : t("Enable")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => rotate.mutate(d.id)} aria-label={t("New key for {{name}}", { name: d.name })}>
                  <KeyRound className="h-4 w-4" /> {t("New key")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t("Remove {{name}}", { name: d.name })}
                  onClick={() => {
                    if (window.confirm(`Remove ${d.name}? Its past scans are kept.`)) remove.mutate(d.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <RegisterDeviceDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(r) => {
          setCreating(false);
          setIssued(r);
          refresh();
        }}
      />
      <KeyDialog issued={issued} onClose={() => setIssued(null)} />
    </Card>
  );
}

function RegisterDeviceDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (r: DeviceWithKey) => void }) {
  const { t } = useTranslation("attendance");
  const [form, setForm] = useState<DeviceInput>({ name: "", kind: "rfid", location: "", serialNumber: "", vendor: "", defaultDirection: "auto" });
  const create = useMutation({ mutationFn: registerDevice, onSuccess: onCreated, onError: (e: Error) => toast.error(e.message) });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Register a device")}</DialogTitle>
          <DialogDescription>{t("The device key is shown once after saving. Enter it in the device, its vendor software or the local gateway.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dev-name">{t("Name")}</Label>
            <Input id="dev-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("Main gate reader")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("Type")}</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as DeviceKind })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rfid">{t("RFID reader")}</SelectItem>
                  <SelectItem value="biometric">{t("Biometric terminal")}</SelectItem>
                  <SelectItem value="faceKiosk">{t("Face kiosk")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Scans mean")}</Label>
              <Select value={form.defaultDirection} onValueChange={(v) => setForm({ ...form, defaultDirection: v as ScanDirection })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t("First in, then out")}</SelectItem>
                  <SelectItem value="in">{t("Entry")}</SelectItem>
                  <SelectItem value="out">{t("Exit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-loc">{t("Location")}</Label>
              <Input id="dev-loc" value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-vendor">{t("Vendor / model")}</Label>
              <Input id="dev-vendor" value={form.vendor ?? ""} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            </div>
          </div>
          {form.kind === "biometric" && (
            <div className="space-y-1.5">
              <Label htmlFor="dev-sn">{t("Serial number (ZKTeco / eSSL ADMS terminals)")}</Label>
              <Input id="dev-sn" value={form.serialNumber ?? ""} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => create.mutate(form)} disabled={!form.name.trim() || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Register")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KeyDialog({ issued, onClose }: { issued: DeviceWithKey | null; onClose: () => void }) {
  const { t } = useTranslation("attendance");
  return (
    <Dialog open={!!issued} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Device key for")} {issued?.device.name}</DialogTitle>
          <DialogDescription>{t("Copy it now. It is not stored in readable form and cannot be shown again; issue a new key if it is lost.")}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={issued?.deviceKey ?? ""} aria-label={t("Device key")} className="font-mono text-xs" />
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(issued?.deviceKey ?? "");
              toast.success(t("Copied"));
            }}
          >
            <Copy className="h-4 w-4" /> {t("Copy")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("The device sends it in the")} <code>{t("X-Device-Key")}</code> {t("header to")} <code>{t("/services/academic/api/attendance/device/…")}</code>{t(". ZKTeco ADMS terminals use their serial number instead (see the setup guide).")}
        </p>
        <DialogFooter>
          <Button onClick={onClose}>{t("Done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
