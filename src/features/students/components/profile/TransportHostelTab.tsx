import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bus, Home } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { listHostelMasters, listRooms } from "@/features/hostel/api";
import { listRoutes, listStops } from "@/features/transport/api";
import { updateHostel, updateTransport } from "../../api";
import type { HostelDetails, Student, TransportDetails } from "../../types";

interface Option {
  value: string;
  label: string;
}

/**
 * A value picked from a master list. The student record stores names, so a name that is no longer in the master list (a renamed
 * route, a closed hostel) is kept as an option instead of being dropped, and what was saved earlier is always shown filled in.
 */
function MasterSelect({ id, value, onChange, options, placeholder, disabled }: { id: string; value: string | undefined; onChange: (v: string) => void; options: Option[]; placeholder: string; disabled?: boolean }) {
  const all = value && !options.some((o) => o.value === value) ? [{ value, label: value }, ...options] : options;
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {all.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function TransportHostelTab({ student }: { student: Student }) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    queryClient.invalidateQueries({ queryKey: ["students", student.id] });
  };

  const {
    register: registerTransport,
    handleSubmit: handleSubmitTransport,
    control: transportControl,
    watch: watchTransport,
    setValue: setTransportValue,
  } = useForm<TransportDetails>({ defaultValues: student.transport });
  const transportRequired = watchTransport("required");
  const routeName = watchTransport("routeName");

  // Routes and pickup points come from the transport master. An account that cannot read it (no transport module) keeps free-text fields.
  const routes = useQuery({ queryKey: ["students", "masters", "routes"], queryFn: listRoutes, enabled: transportRequired, retry: false, staleTime: 60_000 });
  const activeRoutes = (routes.data ?? []).filter((r) => r.status === "active");
  const selectedRoute = (routes.data ?? []).find((r) => r.name === routeName);
  const stops = useQuery({
    queryKey: ["students", "masters", "stops", selectedRoute?.id],
    queryFn: () => listStops(selectedRoute!.id),
    enabled: transportRequired && !!selectedRoute,
    retry: false,
    staleTime: 60_000,
  });

  const transportMutation = useMutation({
    mutationFn: (values: TransportDetails) => updateTransport(student.id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Transport details saved");
    },
  });

  const {
    register: registerHostel,
    handleSubmit: handleSubmitHostel,
    control: hostelControl,
    watch: watchHostel,
    setValue: setHostelValue,
  } = useForm<HostelDetails>({ defaultValues: student.hostel });
  const hostelRequired = watchHostel("required");
  const hostelName = watchHostel("hostelName");

  const hostels = useQuery({ queryKey: ["students", "masters", "hostels"], queryFn: listHostelMasters, enabled: hostelRequired, retry: false, staleTime: 60_000 });
  const activeHostels = (hostels.data ?? []).filter((h) => h.status === "active");
  const selectedHostel = (hostels.data ?? []).find((h) => h.name === hostelName);
  const rooms = useQuery({
    queryKey: ["students", "masters", "rooms", selectedHostel?.id],
    queryFn: () => listRooms(selectedHostel!.id),
    enabled: hostelRequired && !!selectedHostel,
    retry: false,
    staleTime: 60_000,
  });

  const hostelMutation = useMutation({
    mutationFn: (values: HostelDetails) => updateHostel(student.id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Hostel details saved");
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="w-4 h-4 text-muted-foreground" />
            Transport
          </CardTitle>
          <CardDescription>School bus route and pickup point, if the student uses transport.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitTransport((values) => transportMutation.mutate(values))} className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="transport-required">Requires school transport</Label>
              <Controller
                control={transportControl}
                name="required"
                render={({ field }) => <Switch id="transport-required" checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
            {transportRequired && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="routeName">Route</Label>
                  {routes.isError ? (
                    <Input id="routeName" {...registerTransport("routeName")} />
                  ) : (
                    <Controller
                      control={transportControl}
                      name="routeName"
                      render={({ field }) => (
                        <MasterSelect
                          id="routeName"
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            // A pickup point belongs to one route, so choosing another route clears it.
                            if (v !== field.value) setTransportValue("pickupPoint", "", { shouldDirty: true });
                          }}
                          options={activeRoutes.map((r) => ({ value: r.name, label: r.name }))}
                          placeholder={routes.isLoading ? "Loading routes…" : activeRoutes.length ? "Select a route" : "No routes set up"}
                        />
                      )}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pickupPoint">Pickup point</Label>
                  {routes.isError ? (
                    <Input id="pickupPoint" {...registerTransport("pickupPoint")} />
                  ) : (
                    <Controller
                      control={transportControl}
                      name="pickupPoint"
                      render={({ field }) => (
                        <MasterSelect
                          id="pickupPoint"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={!routeName}
                          options={(stops.data ?? []).map((s) => ({ value: s.name, label: s.name }))}
                          placeholder={!routeName ? "Select a route first" : stops.isLoading ? "Loading stops…" : stops.data?.length ? "Select a pickup point" : "No stops on this route"}
                        />
                      )}
                    />
                  )}
                </div>
              </div>
            )}
            <Button type="submit" size="sm" loading={transportMutation.isPending}>
              Save transport details
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-4 h-4 text-muted-foreground" />
            Hostel
          </CardTitle>
          <CardDescription>Boarding assignment, if the student resides on campus.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitHostel((values) => hostelMutation.mutate(values))} className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="hostel-required">Resides in hostel</Label>
              <Controller
                control={hostelControl}
                name="required"
                render={({ field }) => <Switch id="hostel-required" checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
            {hostelRequired && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hostelName">Hostel</Label>
                  {hostels.isError ? (
                    <Input id="hostelName" {...registerHostel("hostelName")} />
                  ) : (
                    <Controller
                      control={hostelControl}
                      name="hostelName"
                      render={({ field }) => (
                        <MasterSelect
                          id="hostelName"
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            // A room belongs to one hostel, so choosing another hostel clears it.
                            if (v !== field.value) setHostelValue("roomNumber", "", { shouldDirty: true });
                          }}
                          options={activeHostels.map((h) => ({ value: h.name, label: h.name }))}
                          placeholder={hostels.isLoading ? "Loading hostels…" : activeHostels.length ? "Select a hostel" : "No hostels set up"}
                        />
                      )}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="roomNumber">Room number</Label>
                  {hostels.isError ? (
                    <Input id="roomNumber" {...registerHostel("roomNumber")} />
                  ) : (
                    <Controller
                      control={hostelControl}
                      name="roomNumber"
                      render={({ field }) => (
                        <MasterSelect
                          id="roomNumber"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={!hostelName}
                          options={(rooms.data ?? [])
                            .filter((r) => r.status === "active" || r.roomNumber === field.value)
                            .map((r) => ({ value: r.roomNumber, label: r.floor ? `${r.roomNumber} · ${r.floor}` : r.roomNumber }))}
                          placeholder={!hostelName ? "Select a hostel first" : rooms.isLoading ? "Loading rooms…" : rooms.data?.length ? "Select a room" : "No rooms in this hostel"}
                        />
                      )}
                    />
                  )}
                </div>
              </div>
            )}
            <Button type="submit" size="sm" loading={hostelMutation.isPending}>
              Save hostel details
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
