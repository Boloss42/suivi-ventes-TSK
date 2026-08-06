"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateAgency, type UpdateAgencyState } from "@/lib/actions/agencies";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : "Enregistrer"}
    </button>
  );
}

export default function EditAgencyForm({
  agencyId,
  name,
  maxStaffAccounts,
}: {
  agencyId: string;
  name: string;
  maxStaffAccounts: number;
}) {
  const updateWithId = updateAgency.bind(null, agencyId);
  const [state, formAction] = useActionState<UpdateAgencyState, FormData>(updateWithId, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">Nom de l&apos;agence</label>
        <input
          name="name"
          defaultValue={name}
          required
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
          defaultValue={maxStaffAccounts}
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Modifications enregistrées.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
