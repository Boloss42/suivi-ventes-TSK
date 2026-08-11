import type { SaleEstimate as SaleEstimateData } from "@/lib/saleEstimate";

const TONE_STYLES: Record<SaleEstimateData["tone"], { badge: string; text: string }> = {
  good: { badge: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
  neutral: { badge: "bg-ink-50 border-ink-100", text: "text-ink-700" },
  warning: { badge: "bg-amber-50 border-amber-100", text: "text-amber-700" },
};

// Estimation indicative du délai de vente (voir lib/saleEstimate.ts).
export default function SaleEstimate({ estimate }: { estimate: SaleEstimateData }) {
  const style = TONE_STYLES[estimate.tone];

  return (
    <div className={`animate-rise rounded-lg border p-6 ${style.badge}`}>
      <h2 className="text-xs font-medium uppercase tracking-wide text-ink-400">
        Estimation du délai de vente
      </h2>
      <p className={`mt-1 text-xl font-bold ${style.text}`}>{estimate.headline}</p>
      <p className="mt-2 text-sm text-ink-700">{estimate.detail}</p>
      <p className="mt-3 text-xs text-ink-400">
        Estimation indicative, calculée à partir de vos statistiques et du prix.
      </p>
    </div>
  );
}
