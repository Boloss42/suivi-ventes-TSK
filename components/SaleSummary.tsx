// Bandeau de synthèse de la vente. Les relevés hebdomadaires sont des TOTAUX
// CUMULÉS (snapshot des stats de la plateforme à l'instant de la saisie), pas
// des incréments. Donc :
//   - le total « depuis la mise en vente » = le dernier relevé (dernier snapshot) ;
//   - l'évolution « cette semaine » = dernier relevé − relevé précédent.

export type SummaryMetric = {
  label: string;
  // Total cumulé = valeur du dernier relevé.
  total: number;
  // Gain de la dernière semaine (dernier relevé − précédent), null si un seul relevé.
  weekDelta: number | null;
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
            <WeekDelta delta={m.weekDelta} />
          </div>
        ))}
      </dl>
    </div>
  );
}

function WeekDelta({ delta }: { delta: number | null }) {
  // Un seul relevé : pas de semaine précédente pour calculer un gain.
  if (delta == null) {
    return <p className="mt-0.5 text-xs text-ink-300">—</p>;
  }
  if (delta === 0) {
    return <p className="mt-0.5 text-xs text-ink-400">→ 0 cette sem.</p>;
  }

  const positive = delta > 0;
  const arrow = positive ? "↑" : "↓";
  const color = positive ? "text-emerald-600" : "text-amber-600";
  const sign = positive ? "+" : "";

  return (
    <p className={`mt-0.5 text-xs ${color}`}>
      {arrow} {sign}
      {delta} cette sem.
    </p>
  );
}
