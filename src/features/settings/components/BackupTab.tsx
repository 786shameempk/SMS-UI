import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { exportBackup, listBackupHistory, restoreBackup } from "../api";

const TYPE_LABEL: Record<string, string> = { export: "Exported", restore: "Restored" };

export default function BackupTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<File | null>(null);
  const { t } = useTranslation("settings");

  const { data: history = [], isLoading } = useQuery({ queryKey: ["settings", "backup-history"], queryFn: listBackupHistory });

  const exportMutation = useMutation({
    mutationFn: exportBackup,
    onSuccess: ({ filename }) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "backup-history"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "audit-log"] });
      toast.success(t("Downloaded {{file}}", { file: filename }));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not export backup")),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreBackup,
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("Could not restore backup"));
      setConfirmRestoreFile(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setConfirmRestoreFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("Backup & restore")}</CardTitle>
          <CardDescription>
            {t(
              "Export this school's configuration — profile, localization, appearance, message templates and feature toggles — as a JSON file, or restore it from a previous export. Records such as students and fees live in each module's own database and are backed up there.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t("Export backup")}
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
            {t("Restore from file")}
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Backup history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">{t("Loading…")}</p>}
          {!isLoading && history.length === 0 && <p className="text-sm text-muted-foreground">{t("No backup activity yet.")}</p>}
          <div className="divide-y divide-border">
            {history.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-foreground">{TYPE_LABEL[event.type] ? t(TYPE_LABEL[event.type]) : event.type}</p>
                  {event.actor && <p className="text-xs text-muted-foreground">{t("by {{name}}", { name: event.actor })}</p>}
                </div>
                <div className="text-end text-xs text-muted-foreground">
                  <p>{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmRestoreFile)}
        onOpenChange={(v) => !v && setConfirmRestoreFile(null)}
        title={t("Restore backup")}
        description={t("Restore from \"{{file}}\"? This replaces the school's current configuration and reloads the app.", { file: confirmRestoreFile?.name })}
        confirmLabel={t("Restore")}
        confirmVariant="destructive"
        submitting={restoreMutation.isPending}
        onConfirm={() => {
          if (confirmRestoreFile) restoreMutation.mutate(confirmRestoreFile);
        }}
      />

    </div>
  );
}
