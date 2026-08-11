"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { suggestPriceDropToClient, type SuggestPriceState } from "@/lib/actions/priceProposals";
import { formatPrice } from "@/lib/format";

// Bouton (dans la carte « Chances de vente ») permettant à l'agent de
// recommander une baisse de prix à son client : notification in-app + email.

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="press rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Envoi..." : "Envoyer au client"}
    </button>
  );
}

export default function PriceSuggestionPanel({
  vehicleId,
  currentPrice,
  advisedPrice,
}: {
  vehicleId: string;
  currentPrice: number;
  advisedPrice: number | null;
}) {
  const [state, formAction] = useActionState<SuggestPriceState, FormData>(
    suggestPriceDropToClient,
    {},
  );
  const [open, setOpen] = useState(false);

  // Pré-remplit avec le prix conseillé s'il représente une vraie baisse.
  const defaultPrice = advisedPrice != null && advisedPrice < currentPrice ? String(advisedPrice) : "";

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press inline-flex items-center gap-1 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
        >
          Proposer une baisse au client →
        </button>
        {state.success && (
          <p className="mt-2 text-xs text-emerald-700">
            Recommandation envoyée au client (notification + email).
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-ink-100 bg-white p-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <p className="text-xs text-ink-500">
        Prix actuel : <span className="font-medium text-ink-800">{formatPrice(currentPrice)}</span>
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-800">Prix recommandé (€)</label>
        <input
          name="proposedPrice"
          type="number"
          min={1}
          required
          defaultValue={defaultPrice}
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-800">Message (optionnel)</label>
        <textarea
          name="message"
          rows={2}
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          placeholder="Expliquez votre recommandation..."
        />
      </div>
      <p className="text-xs text-ink-400">Le client recevra une notification dans l&apos;app et un email.</p>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex items-center gap-2">
        <SubmitButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
