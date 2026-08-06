"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAgency, type AgencyActionState } from "@/lib/actions/agencies";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Création..." : "Créer l'agence"}
    </button>
  );
}

export default function NewAgencyForm() {
  const [state, formAction] = useActionState<AgencyActionState, FormData>(createAgency, {});

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-lg border border-ink-100 bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">Nom de l&apos;agence</label>
        <input
          name="name"
          required
          placeholder="Transakauto Lyon"
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">
          Nombre max de comptes agents
        </label>
        <input
          name="maxStaffAccounts"
          type="number"
          min={1}
          required
          defaultValue={1}
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-ink-400">
          Correspond au nombre d&apos;abonnements vendus à cette agence. Modifiable à tout moment.
        </p>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
