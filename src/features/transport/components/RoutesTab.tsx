import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MapPin, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { ROUTE_STATUS_CONFIG } from "../constants";
import { createRoute, deleteRoute, listBuses, listDrivers, listRoutes, listStops, updateRoute } from "../api";
import type { TransportRoute, TransportRouteFormValues } from "../types";
import RouteFormDialog from "./RouteFormDialog";
import RouteStopsDialog from "./RouteStopsDialog";

export default function RoutesTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransportRoute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransportRoute | null>(null);
  const [stopsRoute, setStopsRoute] = useState<TransportRoute | null>(null);
  const [stopsOpen, setStopsOpen] = useState(false);

  const { data: routes = [], isLoading } = useQuery({ queryKey: ["transport", "routes"], queryFn: listRoutes });
  const { data: buses = [] } = useQuery({ queryKey: ["transport", "buses"], queryFn: listBuses });
  const { data: drivers = [] } = useQuery({ queryKey: ["transport", "drivers"], queryFn: listDrivers });
  const { data: allStops = [] } = useQuery({ queryKey: ["transport", "stops", "all"], queryFn: () => listStops() });

  const busById = useMemo(() => new Map(buses.map((b) => [b.id, b] as const)), [buses]);
  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d] as const)), [drivers]);
  const stopCountByRoute = useMemo(() => {
    const map = new Map<string, number>();
    for (const stop of allStops) map.set(stop.routeId, (map.get(stop.routeId) ?? 0) + 1);
    return map;
  }, [allStops]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport"] });

  const createMutation = useMutation({
    mutationFn: createRoute,
    onSuccess: () => {
      invalidate();
      toast.success("Route created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create route"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TransportRouteFormValues }) => updateRoute(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Route updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update route"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => {
      invalidate();
      toast.success("Route deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete route"),
  });

  const columns: ColumnDef<TransportRoute, unknown>[] = [
    {
      accessorKey: "name",
      header: "Route",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.startTime} – {row.original.endTime} · {stopCountByRoute.get(row.original.id) ?? 0} stops
          </p>
        </div>
      ),
    },
    {
      id: "bus",
      header: "Bus",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.busId ? busById.get(row.original.busId)?.regNumber ?? "—" : "Unassigned"}</span>,
    },
    {
      id: "driver",
      header: "Driver",
      cell: ({ row }) => {
        const driver = row.original.driverId ? driverById.get(row.original.driverId) : undefined;
        return <span className="text-sm text-slate-600">{driver ? `${driver.staff.firstName} ${driver.staff.lastName}` : "Unassigned"}</span>;
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = ROUTE_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const route = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setStopsRoute(route);
                  setStopsOpen(true);
                }}
              >
                <MapPin className="w-3.5 h-3.5" />
                Manage stops
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditing(route);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(route)}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Manage transport routes, their bus/driver assignment, and stops.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New route
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={routes} isLoading={isLoading} emptyMessage="No routes yet." pageSize={8} />

      <RouteFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        route={editing}
        buses={buses}
        drivers={drivers}
        routes={routes}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <RouteStopsDialog
        open={stopsOpen}
        onOpenChange={(v) => {
          setStopsOpen(v);
          if (!v) setStopsRoute(null);
        }}
        route={stopsRoute}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete route"
        description={`Delete "${deleteTarget?.name}"? All of its stops will be removed too. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
