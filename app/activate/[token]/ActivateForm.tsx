"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { activateAccount, type ActivateState } from "@/lib/actions/activate";

const inputClass =
  "w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-sm font-medium text-ink-800";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Activation..." : "Activer mon compte"}
    </button>
  );
}

export default function ActivateForm({ token, email }: { token: string; email: string }) {
  const activateWithToken = activateAccount.bind(null, token);
  const [state, formAction] = useActionState<ActivateState, FormData>(activateWithToken, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Email</label>
        <input
          value={email}
          disabled
          className="w-full rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-500"
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Choisissez un mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-400">8 caractères minimum.</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirmez le mot de passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
