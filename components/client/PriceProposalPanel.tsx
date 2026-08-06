"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { proposePriceAdjustment, type ProposePriceState } from "@/lib/actions/priceProposals";
import { formatDate, formatPrice } from "@/lib/format";

export type LatestProposal = {
  proposedPrice: number;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
} | null;

const statusLabels: Record<string, string> = {
  PENDING: "En attente de réponse",
  ACCEPTED: "Acceptée",
  REJECTED: "Déclinée",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-ink-100 text-ink-600 border-ink-200",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Envoi..." : "Envoyer la proposition"}
    </button>
  );
}

export default function PriceProposalPanel({
  vehicleId,
  currentPrice,
  latestProposal,
}: {
  vehicleId: string;
  currentPrice: number;
  latestProposal: LatestProposal;
}) {
  const [state, formAction] = useActionState<ProposePriceState, FormData>(
    proposePriceAdjustment,
    {},
  );

  const isPending = latestProposal?.status === "PENDING";

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold text-ink-800">
        Proposer un ajustement de prix
      </h2>
      <p className="mb-4 text-sm text-ink-500">
        Prix net vendeur actuel : <span className="font-medium text-ink-800">{formatPrice(currentPrice)}</span>
      </p>

      {latestProposal && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${statusStyles[latestProposal.status]}`}
        >
          <p className="font-medium">
            Proposition à {formatPrice(latestProposal.proposedPrice)} — {statusLabels[latestProposal.status]}
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            Envoyée le {formatDate(latestProposal.createdAt)}
            {latestProposal.message ? ` — « ${latestProposal.message} »` : ""}
          </p>
        </div>
      )}

      {isPending ? (
        <p className="text-sm text-ink-400">
          Une réponse vous sera notifiée dès que le staff aura traité votre proposition.
        </p>
      ) : (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-ink-800">
                Prix proposé (€)
              </label>
              <input
                name="proposedPrice"
                type="number"
                min={1}
                required
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <SubmitButton />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-800">
              Message (optionnel)
            </label>
            <textarea
              name="message"
              rows={2}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Précisez votre demande si besoin..."
            />
          </div>
          {state.error && <p className="text-sm text-red-700">{state.error}</p>}
          {state.success && (
            <p className="text-sm text-emerald-700">
              Proposition envoyée, le staff va l&apos;examiner.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
