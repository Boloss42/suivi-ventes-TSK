"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, type ForgotPasswordState } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Envoi..." : "Recevoir le lien de réinitialisation"}
    </button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Si un compte est associé à cette adresse, un email contenant un lien de
          réinitialisation vient d&apos;être envoyé. Pensez à vérifier vos spams.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-brand-700 hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-base text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:text-sm"
          placeholder="vous@exemple.fr"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton />

      <p className="text-center text-sm text-ink-500">
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
