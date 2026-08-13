"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type StatPoint = {
  week: string;
  views: number;
  detailViews: number;
  contacts: number;
  calls: number;
  favorites: number;
  visits: number;
  offers: number;
};

const METRICS = [
  { key: "views", label: "Apparitions", color: "#ec028c" },
  { key: "detailViews", label: "Vues", color: "#2563eb" },
  { key: "contacts", label: "Contacts", color: "#c05621" },
  { key: "calls", label: "Appels", color: "#2f855a" },
  { key: "favorites", label: "Favoris", color: "#b7791f" },
  { key: "visits", label: "Visites", color: "#6b46c1" },
  { key: "offers", label: "Offres", color: "#1a1a1a" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

export default function StatDetailChart({
  data,
  latestValues,
  latestWeekLabel,
}: {
  data: StatPoint[];
  latestValues: Partial<Record<MetricKey, number>>;
  latestWeekLabel: string | null;
}) {
  const [selected, setSelected] = useState<MetricKey>("views");
  const metric = METRICS.find((m) => m.key === selected)!;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setSelected(m.key)}
            aria-pressed={selected === m.key}
            className={`rounded-lg border p-3 text-center transition ${
              selected === m.key
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                : "border-ink-100 bg-white hover:border-brand-300"
            }`}
          >
            <p className="text-lg font-semibold text-ink-900">{latestValues[m.key] ?? "—"}</p>
            <p className="text-xs text-ink-500">{m.label}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-ink-100 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink-800">
          Évolution — {metric.label}
        </h2>
        <p className="mb-4 text-sm text-ink-500">
          {latestWeekLabel
            ? `Dernier relevé : ${latestWeekLabel}`
            : "Aucun relevé saisi pour le moment."}
        </p>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="week" stroke="#9a9a9a" fontSize={12} />
              <YAxis stroke="#9a9a9a" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, borderColor: "#e0e0e0", fontSize: 13 }}
                labelStyle={{ color: "#1a1a1a" }}
                formatter={(value: number) => [value, metric.label]}
              />
              <Line
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-ink-400">
            Les statistiques apparaîtront ici dès le premier relevé hebdomadaire.
          </p>
        )}
      </div>
    </div>
  );
}
