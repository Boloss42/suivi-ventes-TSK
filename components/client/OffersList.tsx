import { formatPrice, formatDate } from "@/lib/format";

// Vue client (lecture seule) des offres d'achat reçues : montant, statut et nom
// de l'acheteur. Le contact de l'acheteur et les notes internes ne sont jamais
// exposés au client (gérés par l'agent).

export type ClientOffer = {
  id: string;
  amount: number;
  buyerName: string | null;
  status: "NEW" | "COUNTERED" | "ACCEPTED" | "REJECTED";
  createdAt: string;
};

const STATUS_META: Record<ClientOffer["status"], { label: string; badge: string }> = {
  NEW: { label: "Nouvelle", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  COUNTERED: { label: "En négociation", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  ACCEPTED: { label: "Acceptée", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Déclinée", badge: "bg-ink-100 text-ink-600 border-ink-200" },
};

export default function OffersList({ offers }: { offers: ClientOffer[] }) {
  if (offers.length === 0) return null;

  return (
    <div className="animate-rise rounded-lg border border-ink-100 bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold text-ink-800">Offres reçues ({offers.length})</h2>
      <p className="mb-4 text-xs text-ink-500">
        Les offres transmises par votre conseiller. Il vous accompagne pour la suite.
      </p>
      <ul className="space-y-3">
        {offers.map((offer) => (
          <li
            key={offer.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink-100 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-ink-900">{formatPrice(offer.amount)}</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_META[offer.status].badge}`}>
                {STATUS_META[offer.status].label}
              </span>
            </div>
            <span className="text-xs text-ink-400">
              {offer.buyerName ? `${offer.buyerName} · ` : ""}
              {formatDate(offer.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
