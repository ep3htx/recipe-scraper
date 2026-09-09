import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import Card from "./Card";
import type { ChartPoint } from "../api/types";

export default function LineChartCard({
  title,
  series,
  unit,
  color = "#16a367",
  height = 200,
  loading,
}: {
  title: string;
  series: ChartPoint[];
  unit?: string;
  color?: string;
  height?: number;
  loading?: boolean;
}) {
  const data = series.map((p) => ({ ...p, dateLabel: format(parseISO(p.date), "MMM d") }));

  return (
    <Card title={title}>
      {loading ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">Loading…</div>
      ) : data.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">No data yet for this period.</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" vertical={false} />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} minTickGap={30} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} domain={["auto", "auto"]} />
            <Tooltip
              formatter={(v: number) => [`${v}${unit ?? ""}`, title]}
              contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: 12 }}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
