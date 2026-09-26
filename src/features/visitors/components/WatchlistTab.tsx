import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatRelativeDay } from "@/utils/format";
import { addWatchlistEntry, deleteWatchlistEntry, listWatchlist } from "../api";
import type { WatchlistEntry } from "../types";
import WatchlistFormDialog from "./WatchlistFormDialog";

export default function WatchlistTab() {
  const queryClient = useQueryClient();
  const { data: watchlist = [], isLoading } = useQuery({ queryKey: ["visitors", "watchlist"], queryFn: listWatchlist });
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WatchlistEntry | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["visitors", "watchlist"] });

  const createMutation = useMutation({
    mutationFn: addWatchlistEntry,
    onSuccess: () => {
      invalidate();
      toast.success("Added to watchlist");
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWatchlistEntry,
    onSuccess: () => {
      invalidate();
      toast.success("Removed from watchlist");
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-xl">
          Names here trigger a warning banner if entered during visitor check-in. Front desk staff still decide whether to admit — this doesn't block entry automatically.
        </p>
        <Button variant="destructive" onClick={() => setFormOpen(true)}>
          <UserX className="w-4 h-4" />
          Add to watchlist
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && watchlist.length === 0 && <p className="text-sm text-muted-foreground">The watchlist is empty.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {watchlist.map((entry) => (
          <Card key={entry.id} className="border-destructive/30">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-destructive-soft text-destructive-strong flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{entry.name}</p>
                  {entry.phone && <p className="text-xs text-muted-foreground">{entry.phone}</p>}
                  <p className="text-sm text-secondary-foreground mt-1">{entry.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">Added {formatRelativeDay(entry.addedAt)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDeleteTarget(entry)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive-strong" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <WatchlistFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove from watchlist"
        description={`Remove "${deleteTarget?.name}" from the watchlist?`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
