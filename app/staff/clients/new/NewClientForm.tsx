"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createClient, type ClientActionState } from "@/lib/actions/clients";
import InvitePanel from "@/components/InvitePanel";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Création..." : "Créer le client"}
    </button>
  );
}

const initialState: ClientActionState = {};

export default function NewClientForm() {
  const [state, formAction] = useActionState(createClient, initialState);

  if (state.success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="mb-2 text-base font-semibold text-emerald-800">
          Client créé avec succès
        </h2>
        <p className="mb-4 text-sm text-emerald-700">
          Transmettez ce lien au client (ou faites-lui scanner le QR code)
          pour qu&apos;il active son espace et choisisse son mot de passe.
        </p>
        <div className="mb-4 rounded-md bg-white p-4">
          <InvitePanel inviteUrl={state.success.inviteUrl} qrSvg={state.success.qrSvg} />
        </div>
        <div className="flex gap-3">
          <Link
            href={`/staff/clients/${state.success.clientId}`}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Voir la fiche client
          </Link>
          <Link
            href="/staff/clients/new"
            className="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-white"
          >
            Créer un autre client
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-lg border border-ink-100 bg-white p-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-800">Prénom</label>
          <input
            name="firstName"
            required
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-800">Nom</label>
          <input
            name="lastName"
            required
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">
          Téléphone <span className="font-normal text-ink-400">(optionnel)</span>
        </label>
        <input
          name="phone"
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
