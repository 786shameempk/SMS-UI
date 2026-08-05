import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listClasses, listSections } from "@/features/academics/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getYearlyTrend, listRosterSections } from "../../api";

export default function YearlyAttendanceReport() {
  const { data: classes = [] } = useQuery({ queryKey: ["attendance", "classes"], queryFn: listClasses });
  const { data: sections = [] } = useQuery({ queryKey: ["attendance", "sections"], queryFn: listSections });
  const { data: rosterSections = [] } = useQuery({ queryKey: ["attendance", "roster-sections"], queryFn: listRosterSections });

  const [sectionId, setSectionId] = useState("all");

  const rosterSectionIds = useMemo(() => rosterSections.map((r) => r.sectionId), [rosterSections]);

  const { data: trend = [], isLoading } = useQuery({
    queryKey: ["attendance", "report-yearly", sectionId],
    queryFn: () => getYearlyTrend(sectionId === "all" ? undefined : sectionId),
  });

  const sectionLabel = (id: string) => {
    const section = sections.find((s) => s.id === id);
    const schoolClass = section ? classes.find((c) => c.id === section.classId) : undefined;
    return section ? `${schoolClass?.name ?? "—"} · ${section.name}` : id;
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>Yearly attendance trend</CardTitle>
          <CardDescription>Percentage present by month, across the recorded attendance history.</CardDescription>
        </div>
        <Select value={sectionId} onValueChange={setSectionId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            {rosterSectionIds.map((id) => (
              <SelectItem key={id} value={id}>
                {sectionLabel(id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          {!isLoading && !trend.length ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No historical attendance data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  width={40}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value) => [`${value}%`, "Present"]}
                />
                <Line type="monotone" dataKey="percentPresent" stroke="var(--color-brand-500)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
