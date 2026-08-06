"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateStaffProfile, type ProfileState } from "@/lib/actions/profile";

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

export default function ProfileForm({
  currentFirstName,
  currentPhone,
}: {
  currentFirstName: string;
  currentPhone: string;
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(updateStaffProfile, {});

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">Prénom</label>
        <input
          name="firstName"
          defaultValue={currentFirstName}
          placeholder="Jean"
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-ink-400">
          Affiché à vos clients sous « Votre conseillé », à la place de votre email.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">
          Numéro de téléphone
        </label>
        <input
          name="phone"
          type="tel"
          defaultValue={currentPhone}
          placeholder="06 12 34 56 78"
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-ink-400">
          Affiché à vos clients dans leur espace, pour qu&apos;ils puissent vous joindre.
        </p>
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
