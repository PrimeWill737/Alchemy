"use client";

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Point = { month: string; revenue: number };

export function RevenueChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p style={{ color: "var(--text-secondary)", margin: 0 }}>No revenue data for this period yet.</p>;
  }

  return (
    <div style={{ width: "100%", minHeight: 280 }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
