import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BedDouble, Building2, Percent } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_NEUTRAL, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "../constants";
import { getHostelOccupancyReport } from "../api";
import StatTile from "./StatTile";

export default function HostelOccupancyTab() {
  const { data, isLoading } = useQuery({ queryKey: ["reports", "hostel-occupancy"], queryFn: getHostelOccupancyReport });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Beds occupied" value={String(data.totalOccupied)} icon={BedDouble} />
        <StatTile label="Total beds" value={String(data.totalBeds)} icon={Building2} />
        <StatTile label="Overall occupancy" value={`${data.overallOccupancy}%`} icon={Percent} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Occupancy by hostel</CardTitle>
          <CardDescription>Occupied vs. vacant beds per hostel.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.hostels.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No hostels on record.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hostels} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                  <XAxis dataKey="hostelName" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                  <YAxis tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="occupied" name="Occupied" stackId="beds" fill={CHART_PRIMARY} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="vacant" name="Vacant" stackId="beds" fill={CHART_NEUTRAL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
