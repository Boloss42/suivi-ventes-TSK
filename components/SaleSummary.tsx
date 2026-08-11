// Bandeau de synthèse de la vente : totaux cumulés depuis la mise en vente
// (vues, contacts, appels, favoris, visites, offres) avec, pour chaque
// indicateur, l'évolution de la dernière semaine par rapport à la précédente.

export type SummaryMetric = {
  label: string;
  total: number;
  // Valeur de la dernière semaine relevée (null si aucun relevé).
  week: number | null;
  // Valeur de la semaine précédente (null si moins de deux relevés).
  prevWeek: number | null;
  // Met en avant l'indicateur (offres, visites) car ce sont les signaux forts.
  highlight?: boolean;
};

export default function SaleSummary({
  daysOnline,
  metrics,
}: {
  daysOnline: number;
  metrics: SummaryMetric[];
}) {
  return (
    <div className="animate-rise rounded-lg border border-ink-100 bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-ink-800">Depuis la mise en vente</h2>
        <span className="text-xs text-ink-500">
          En ligne depuis <span className="font-medium text-ink-700">{daysOnline} j</span>
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{m.label}</dt>
            <dd
              className={`mt-1 text-2xl font-bold ${m.highlight && m.total > 0 ? "text-brand-600" : "text-ink-900"}`}
            >
              {m.total}
            </dd>
            <WeekDelta week={m.week} prevWeek={m.prevWeek} />
          </div>
        ))}
      </dl>
    </div>
  );
}

function WeekDelta({ week, prevWeek }: { week: number | null; prevWeek: number | null }) {
  if (week == null) {
    return <p className="mt-0.5 text-xs text-ink-300">—</p>;
  }

  // Sans semaine précédente, on ne peut pas indiquer de tendance.
  if (prevWeek == null) {
    return <p className="mt-0.5 text-xs text-ink-500">+{week} cette sem.</p>;
  }

  const diff = week - prevWeek;
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  const color = diff > 0 ? "text-emerald-600" : diff < 0 ? "text-amber-600" : "text-ink-400";

  return (
    <p className={`mt-0.5 text-xs ${color}`}>
      {arrow} {week} cette sem.
    </p>
  );
}
