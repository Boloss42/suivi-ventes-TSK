"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createOffer, updateOfferStatus, deleteOffer, type CreateOfferState } from "@/lib/actions/offers";
import { formatPrice, formatDate } from "@/lib/format";

export type OfferItem = {
  id: string;
  amount: number;
  buyerName: string | null;
  buyerContact: string | null;
  note: string | null;
  status: "NEW" | "COUNTERED" | "ACCEPTED" | "REJECTED";
  createdAt: string;
};

const STATUS_META: Record<OfferItem["status"], { label: string; badge: string }> = {
  NEW: { label: "Nouvelle", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  COUNTERED: { label: "Contre-proposée", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  ACCEPTED: { label: "Acceptée", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Refusée", badge: "bg-ink-100 text-ink-600 border-ink-200" },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="press rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : "Enregistrer l'offre"}
    </button>
  );
}

export default function OffersPanel({
  vehicleId,
  offers,
}: {
  vehicleId: string;
  offers: OfferItem[];
}) {
  const [state, formAction] = useActionState<CreateOfferState, FormData>(createOffer, {});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-800">Offres d&apos;achat ({offers.length})</h2>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="press rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
          >
            + Ajouter une offre
          </button>
        )}
      </div>

      {open && (
        <form action={formAction} className="mb-5 space-y-3 rounded-md border border-ink-100 bg-ink-50 p-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-800">Montant (€) *</label>
              <input
                name="amount"
                type="number"
                min={1}
                required
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-800">Nom de l&apos;acheteur</label>
              <input
                name="buyerName"
                type="text"
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-800">
              Contact acheteur <span className="font-normal text-ink-400">(réservé à l&apos;agent)</span>
            </label>
            <input
              name="buyerContact"
              type="text"
              placeholder="Téléphone ou email"
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-800">Note (optionnel)</label>
            <textarea
              name="note"
              rows={2}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <p className="text-xs text-ink-400">Le client sera notifié de cette offre (app + email).</p>
          {state.error && <p className="text-sm text-red-700">{state.error}</p>}
          <div className="flex items-center gap-2">
            <SubmitButton />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-white"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {offers.length === 0 ? (
        <p className="text-sm text-ink-400">Aucune offre enregistrée pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-md border border-ink-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-ink-900">{formatPrice(offer.amount)}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_META[offer.status].badge}`}>
                    {STATUS_META[offer.status].label}
                  </span>
                </div>
                <span className="text-xs text-ink-400">{formatDate(offer.createdAt)}</span>
              </div>
              {(offer.buyerName || offer.buyerContact) && (
                <p className="mt-1 text-sm text-ink-600">
                  {offer.buyerName ?? "Acheteur"}
                  {offer.buyerContact ? ` — ${offer.buyerContact}` : ""}
                </p>
              )}
              {offer.note && <p className="mt-1 text-sm text-ink-500">« {offer.note} »</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusButton offerId={offer.id} status="ACCEPTED" current={offer.status} label="Accepter" tone="emerald" />
                <StatusButton offerId={offer.id} status="COUNTERED" current={offer.status} label="Contre-proposer" tone="indigo" />
                <StatusButton offerId={offer.id} status="REJECTED" current={offer.status} label="Refuser" tone="ink" />
                <form action={deleteOffer} className="ml-auto">
                  <input type="hidden" name="offerId" value={offer.id} />
                  <button type="submit" className="text-xs text-ink-400 transition hover:text-red-600">
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusButton({
  offerId,
  status,
  current,
  label,
  tone,
}: {
  offerId: string;
  status: OfferItem["status"];
  current: OfferItem["status"];
  label: string;
  tone: "emerald" | "indigo" | "ink";
}) {
  const active = current === status;
  const toneStyles: Record<string, string> = {
    emerald: active ? "bg-emerald-500 text-white" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    indigo: active ? "bg-indigo-500 text-white" : "border border-indigo-200 text-indigo-700 hover:bg-indigo-50",
    ink: active ? "bg-ink-600 text-white" : "border border-ink-200 text-ink-700 hover:bg-ink-50",
  };
  return (
    <form action={updateOfferStatus.bind(null, offerId, status)}>
      <button
        type="submit"
        disabled={active}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-default ${toneStyles[tone]}`}
      >
        {label}
      </button>
    </form>
  );
}
