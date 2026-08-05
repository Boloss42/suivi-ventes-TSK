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

export type ChartPoint = {
  week: string;
  Vues: number;
  Contacts: number;
  Appels: number;
  Favoris: number;
  Visites: number;
  Offres: number;
};

const SERIES: { key: keyof Omit<ChartPoint, "week">; color: string }[] = [
  { key: "Vues", color: "#ec028c" },
  { key: "Contacts", color: "#c05621" },
  { key: "Appels", color: "#2f855a" },
  { key: "Favoris", color: "#b7791f" },
  { key: "Visites", color: "#6b46c1" },
  { key: "Offres", color: "#1a1a1a" },
];

export default function StatsChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="week" stroke="#9a9a9a" fontSize={12} />
        <YAxis stroke="#9a9a9a" fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            borderColor: "#e0e0e0",
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
