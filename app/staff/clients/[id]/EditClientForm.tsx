"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateClient, type UpdateClientState } from "@/lib/actions/clients";

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

export default function EditClientForm({
  clientId,
  firstName,
  lastName,
  email,
  phone,
}: {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const updateWithId = updateClient.bind(null, clientId);
  const [state, formAction] = useActionState<UpdateClientState, FormData>(
    updateWithId,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-800">Prénom</label>
          <input
            name="firstName"
            defaultValue={firstName}
            required
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-800">Nom</label>
          <input
            name="lastName"
            defaultValue={lastName}
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
          defaultValue={email}
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
          defaultValue={phone}
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
