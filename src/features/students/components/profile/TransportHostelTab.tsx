import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bus, Home, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateHostel, updateTransport } from "../../api";
import type { HostelDetails, Student, TransportDetails } from "../../types";

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
  } = useForm<TransportDetails>({ defaultValues: student.transport });
  const transportRequired = watchTransport("required");

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
  } = useForm<HostelDetails>({ defaultValues: student.hostel });
  const hostelRequired = watchHostel("required");

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
            <Bus className="w-4 h-4 text-slate-400" />
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
                  <Input id="routeName" {...registerTransport("routeName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pickupPoint">Pickup point</Label>
                  <Input id="pickupPoint" {...registerTransport("pickupPoint")} />
                </div>
              </div>
            )}
            <Button type="submit" size="sm" disabled={transportMutation.isPending}>
              {transportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save transport details
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-4 h-4 text-slate-400" />
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
                  <Input id="hostelName" {...registerHostel("hostelName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="roomNumber">Room number</Label>
                  <Input id="roomNumber" {...registerHostel("roomNumber")} />
                </div>
              </div>
            )}
            <Button type="submit" size="sm" disabled={hostelMutation.isPending}>
              {hostelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save hostel details
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
