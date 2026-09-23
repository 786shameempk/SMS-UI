import { Eye, EyeOff, LayoutGrid, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { DashboardWidgetDef, DashboardWidgetId } from "../widgets";

function WidgetRow({ widget, action }: { widget: DashboardWidgetDef; action: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{widget.label}</p>
        <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
      </div>
      {action}
    </li>
  );
}

export default function ManageWidgetsDialog({
  available,
  hidden,
  onChange,
}: {
  available: DashboardWidgetDef[];
  hidden: DashboardWidgetId[];
  onChange: (hidden: DashboardWidgetId[]) => void;
}) {
  const hiddenSet = new Set(hidden);
  const shown = available.filter((w) => !hiddenSet.has(w.id));
  const addable = available.filter((w) => hiddenSet.has(w.id));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
          Manage widgets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage widgets</DialogTitle>
          <DialogDescription>Add or remove cards on your dashboard. Your choice is saved on this device.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add widgets ({addable.length})
          </h3>
          {addable.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-3 py-4 text-center">
              Every widget is already on your dashboard.
            </p>
          ) : (
            <ul className="rounded-lg border border-border divide-y divide-border">
              {addable.map((w) => (
                <WidgetRow
                  key={w.id}
                  widget={w}
                  action={
                    <Button size="sm" className="gap-1 shrink-0" onClick={() => onChange(hidden.filter((id) => id !== w.id))}>
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> On your dashboard ({shown.length})
          </h3>
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-3 py-4 text-center flex items-center justify-center gap-2">
              <EyeOff className="w-4 h-4" /> Your dashboard is empty — add a widget above.
            </p>
          ) : (
            <ul className="rounded-lg border border-border divide-y divide-border">
              {shown.map((w) => (
                <WidgetRow
                  key={w.id}
                  widget={w}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 shrink-0 text-muted-foreground"
                      onClick={() => onChange([...hidden, w.id])}
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </Button>
                  }
                />
              ))}
            </ul>
          )}
        </section>

        {hidden.length > 0 && (
          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onChange([])}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset to default
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
