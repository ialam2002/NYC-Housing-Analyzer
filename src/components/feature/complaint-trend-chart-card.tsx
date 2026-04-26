"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ComplaintTrendPoint } from "@/types/property";

type ComplaintTrendChartCardProps = {
  trends: ComplaintTrendPoint[];
};

function toLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function ComplaintTrendChartCard({ trends }: ComplaintTrendChartCardProps) {
  if (trends.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Complaint Trends</h2>
        <p className="mt-2 text-sm text-muted-foreground">No complaint trend data available yet.</p>
      </div>
    );
  }

  const data = trends.map((point) => ({
    ...point,
    label: toLabel(point.month),
  }));

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">Complaint Trends</h2>
      <div className="mt-3 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 4, right: 8, top: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="noise" stroke="#2563eb" strokeWidth={2} dot={false} name="Noise" />
            <Line
              type="monotone"
              dataKey="heatHotWater"
              stroke="#e11d48"
              strokeWidth={2}
              dot={false}
              name="Heat/Hot Water"
            />
            <Line type="monotone" dataKey="rodents" stroke="#16a34a" strokeWidth={2} dot={false} name="Rodents" />
            <Line
              type="monotone"
              dataKey="sanitation"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              name="Sanitation"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

