"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

export type HistoryStat = {
  id: string;
  weekStart: string;
  views: number;
  contacts: number;
  calls: number;
  favorites: number;
  visits: number;
  offers: number;
  note: string | null;
};

function HistoryRows({ stats }: { stats: HistoryStat[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-ink-100 text-ink-500">
        <tr>
          <th className="py-2 pr-4 font-medium">Semaine</th>
          <th className="py-2 pr-4 font-medium">Vues</th>
          <th className="py-2 pr-4 font-medium">Contacts</th>
          <th className="py-2 pr-4 font-medium">Appels</th>
          <th className="py-2 pr-4 font-medium">Favoris</th>
          <th className="py-2 pr-4 font-medium">Visites</th>
          <th className="py-2 pr-4 font-medium">Offres</th>
          <th className="py-2 pr-4 font-medium">Note</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((stat) => (
          <tr key={stat.id} className="border-b border-ink-50 last:border-0">
            <td className="py-2 pr-4 text-ink-800">{formatDate(stat.weekStart)}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.views}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.contacts}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.calls}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.favorites}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.visits}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.offers}</td>
            <td className="py-2 pr-4 text-ink-500">{stat.note ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function HistoryTable({ stats }: { stats: HistoryStat[] }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-800">Historique détaillé</h2>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Agrandir
        </button>
      </div>
      <div className="overflow-x-auto">
        <HistoryRows stats={stats} />
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          onClick={() => setExpanded(false)}
        >
          <div
            className="w-full max-w-4xl rounded-lg bg-white p-4 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Historique détaillé</h2>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Fermer"
                className="rounded-md p-1 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto">
              <HistoryRows stats={stats} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
