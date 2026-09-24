import { useQuery } from "@tanstack/react-query";
import { Armchair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listSeatAvailability } from "../api";

export default function SeatAvailabilityCard() {
  const { data: seats = [], isLoading } = useQuery({ queryKey: ["students", "seat-availability"], queryFn: () => listSeatAvailability() });

  const trackedSeats = seats.filter((s) => s.capacity > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Armchair className="w-4 h-4 text-slate-400" />
          Seat availability by class
        </CardTitle>
        <CardDescription>Live capacity vs. current enrollment from Academic Management's sections.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-1">
              {trackedSeats.map((s) => (
                <div key={s.className} className="flex flex-col items-center gap-1 rounded-lg border border-border px-3 py-2 min-w-[92px]">
                  <span className="text-xs font-medium text-slate-600">{s.className}</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {s.currentStrength}/{s.capacity}
                  </span>
                  <Badge variant={s.availableSeats > 0 ? "success" : "danger"}>
                    {s.availableSeats > 0 ? `${s.availableSeats} open` : "Full"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
