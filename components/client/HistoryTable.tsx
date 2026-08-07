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

function HistoryRows({
  stats,
  onSelect,
}: {
  stats: HistoryStat[];
  onSelect: (stat: HistoryStat) => void;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-ink-100 text-ink-500">
        <tr>
          <th className="py-2 pr-4 font-medium">Semaine</th>
          <th className="py-2 pr-4 font-medium">Apparitions</th>
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
          <tr
            key={stat.id}
            onClick={() => onSelect(stat)}
            className="cursor-pointer border-b border-ink-50 last:border-0 hover:bg-ink-50/70"
            title="Ouvrir le détail de la semaine"
          >
            <td className="py-2 pr-4 text-ink-800">{formatDate(stat.weekStart)}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.views}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.contacts}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.calls}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.favorites}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.visits}</td>
            <td className="py-2 pr-4 text-ink-600">{stat.offers}</td>
            <td className="py-2 pr-4 text-ink-500">
              <span className="block max-w-[16rem] truncate">
                {stat.note ? stat.note : "—"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-lg bg-white p-4 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
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
        {children}
      </div>
    </div>
  );
}

function StatFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2 text-center">
      <p className="text-lg font-semibold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

/** Détail d'une semaine : chiffres + commentaire affiché en grand. */
function WeekDetail({ stat }: { stat: HistoryStat }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatFigure label="Apparitions" value={stat.views} />
        <StatFigure label="Contacts" value={stat.contacts} />
        <StatFigure label="Appels" value={stat.calls} />
        <StatFigure label="Favoris" value={stat.favorites} />
        <StatFigure label="Visites" value={stat.visits} />
        <StatFigure label="Offres" value={stat.offers} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-800">Commentaire</h3>
        {stat.note ? (
          <p className="whitespace-pre-wrap rounded-lg border border-ink-100 bg-white p-4 text-lg leading-relaxed text-ink-900">
            {stat.note}
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-ink-200 p-4 text-center text-sm text-ink-400">
            Aucun commentaire pour cette semaine.
          </p>
        )}
      </div>
    </div>
  );
}

export default function HistoryTable({ stats }: { stats: HistoryStat[] }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<HistoryStat | null>(null);

  const anyModalOpen = expanded || selected !== null;

  useEffect(() => {
    if (!anyModalOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Escape ferme d'abord le détail de semaine, puis le tableau agrandi.
      if (selected) setSelected(null);
      else if (expanded) setExpanded(false);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [anyModalOpen, selected, expanded]);

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
      <p className="mb-3 text-xs text-ink-500">
        Cliquez sur une semaine pour voir son commentaire en grand.
      </p>
      <div className="overflow-x-auto">
        <HistoryRows stats={stats} onSelect={setSelected} />
      </div>

      {expanded && (
        <ModalShell title="Historique détaillé" onClose={() => setExpanded(false)}>
          <div className="max-h-[75vh] overflow-auto">
            <HistoryRows stats={stats} onSelect={setSelected} />
          </div>
        </ModalShell>
      )}

      {selected && (
        <ModalShell
          title={`Semaine du ${formatDate(selected.weekStart)}`}
          onClose={() => setSelected(null)}
        >
          <WeekDetail stat={selected} />
        </ModalShell>
      )}
    </div>
  );
}
