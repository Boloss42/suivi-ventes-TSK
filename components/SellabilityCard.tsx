import type { Diagnostic } from "@/lib/diagnostic";

const TONE_STYLES: Record<
  Diagnostic["tone"],
  { bar: string; text: string; badge: string }
> = {
  good: { bar: "bg-emerald-500", text: "text-emerald-700", badge: "bg-emerald-50" },
  neutral: { bar: "bg-ink-400", text: "text-ink-600", badge: "bg-ink-50" },
  warning: { bar: "bg-amber-500", text: "text-amber-700", badge: "bg-amber-50" },
  bad: { bar: "bg-red-500", text: "text-red-700", badge: "bg-red-50" },
};

export default function SellabilityCard({
  diagnostic,
  cta,
}: {
  diagnostic: Diagnostic;
  cta?: React.ReactNode;
}) {
  const style = TONE_STYLES[diagnostic.tone];

  return (
    <div className={`animate-rise rounded-lg border border-ink-100 p-6 ${style.badge}`}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-800">Chances de vente</h2>
          <p className="text-xs text-ink-500">Estimation à partir des dernières statistiques.</p>
        </div>
        <p className={`text-3xl font-bold ${style.text}`}>{diagnostic.score}%</p>
      </div>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/70">
        <div
          className={`bar-grow h-full rounded-full ${style.bar}`}
          style={
            {
              width: `${diagnostic.score}%`,
              "--bar-target": `${diagnostic.score}%`,
            } as React.CSSProperties
          }
        />
      </div>

      <p className="text-sm text-ink-800">{diagnostic.verdict}</p>

      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}
