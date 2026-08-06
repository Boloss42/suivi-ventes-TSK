"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateGoogleReviewUrl, type SettingsState } from "@/lib/actions/settings";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : "Enregistrer"}
    </button>
  );
}

export default function SettingsForm({ currentUrl }: { currentUrl: string }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateGoogleReviewUrl,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-ink-800">
            Lien d&apos;avis Google
          </label>
          <input
            name="googleReviewUrl"
            type="url"
            defaultValue={currentUrl}
            placeholder="https://g.page/r/votre-fiche/review"
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <SubmitButton />
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">Enregistré.</p>}
    </form>
  );
}
