import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bus, Percent, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "../constants";
import { getTransportUtilizationReport } from "../api";
import StatTile from "./StatTile";

export default function TransportUtilizationTab() {
  const { data, isLoading } = useQuery({ queryKey: ["reports", "transport-utilization"], queryFn: getTransportUtilizationReport });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Students assigned" value={String(data.totalAssigned)} icon={Users} />
        <StatTile label="Total seating capacity" value={String(data.totalCapacity)} icon={Bus} />
        <StatTile label="Overall utilization" value={`${data.overallUtilization}%`} icon={Percent} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route utilization</CardTitle>
          <CardDescription>Active student assignments as a share of each route's bus capacity.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.routes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No routes with an assigned bus yet.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.routes} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                  <XAxis dataKey="routeName" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={36} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value, _name, entry) => [`${value}% (${entry.payload.assigned}/${entry.payload.capacity})`, "Utilization"]}
                  />
                  <Bar dataKey="utilizationPercent" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
