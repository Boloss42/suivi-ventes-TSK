// Fil chronologique des événements de la vente : mise en dépôt, changements de
// prix, propositions de baisse, meilleure semaine d'activité. Les dates sont
// déjà formatées par la page (composant purement présentationnel).

export type TimelineTone = "brand" | "good" | "neutral" | "warning";

export type TimelineEvent = {
  date: string;
  title: string;
  detail?: string;
  tone: TimelineTone;
};

const DOT: Record<TimelineTone, string> = {
  brand: "bg-brand-500",
  good: "bg-emerald-500",
  neutral: "bg-ink-300",
  warning: "bg-amber-500",
};

export default function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="animate-rise rounded-lg border border-ink-100 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold text-ink-800">Historique de la vente</h2>
      <ol className="relative space-y-5 border-l border-ink-100 pl-5">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${DOT[e.tone]}`}
            />
            <p className="text-xs text-ink-400">{e.date}</p>
            <p className="text-sm font-medium text-ink-900">{e.title}</p>
            {e.detail && <p className="text-sm text-ink-600">{e.detail}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
