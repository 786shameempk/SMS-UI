import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, RotateCcw, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { exportBackup, listBackupHistory, resetDemoData, restoreBackup } from "../api";

const TYPE_LABEL: Record<string, string> = { export: "Exported", restore: "Restored", reset: "Reset to defaults" };

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function BackupTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<File | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const { data: history = [], isLoading } = useQuery({ queryKey: ["settings", "backup-history"], queryFn: listBackupHistory });

  const exportMutation = useMutation({
    mutationFn: exportBackup,
    onSuccess: ({ filename }) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "backup-history"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "audit-log"] });
      toast.success(`Downloaded ${filename}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not export backup"),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreBackup,
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not restore backup");
      setConfirmRestoreFile(null);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetDemoData,
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not reset demo data"),
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
          <CardTitle>Backup &amp; restore</CardTitle>
          <CardDescription>Export every module's data as a JSON file, or restore from a previous export.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export backup
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
            Restore from file
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset demo data</CardTitle>
          <CardDescription>Wipes every module's data back to its original seeded state. Settings, branding, and the audit log are kept.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirmReset(true)} disabled={resetMutation.isPending}>
            {resetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Reset all demo data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup history</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && history.length === 0 && <p className="text-sm text-muted-foreground">No backup activity yet.</p>}
          <div className="divide-y divide-border">
            {history.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{TYPE_LABEL[event.type] ?? event.type}</p>
                  {event.filename && <p className="text-xs text-muted-foreground">{event.filename}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{new Date(event.createdAt).toLocaleString()}</p>
                  <p>{formatBytes(event.sizeBytes)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmRestoreFile)}
        onOpenChange={(v) => !v && setConfirmRestoreFile(null)}
        title="Restore backup"
        description={`Restore from "${confirmRestoreFile?.name}"? This replaces all current module data and reloads the app. This cannot be undone.`}
        confirmLabel="Restore"
        confirmVariant="destructive"
        submitting={restoreMutation.isPending}
        onConfirm={() => {
          if (confirmRestoreFile) restoreMutation.mutate(confirmRestoreFile);
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset all demo data"
        description="This wipes every module's data back to its original seeded state and reloads the app. This cannot be undone."
        confirmLabel="Reset everything"
        confirmVariant="destructive"
        submitting={resetMutation.isPending}
        onConfirm={() => resetMutation.mutate()}
      />
    </div>
  );
}
