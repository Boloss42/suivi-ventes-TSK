"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createStaffAccount, type StaffAccountState } from "@/lib/actions/staffAccounts";
import InvitePanel from "@/components/InvitePanel";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Création..." : "Créer le compte"}
    </button>
  );
}

const initialState: StaffAccountState = {};

export default function NewStaffForm() {
  const [state, formAction] = useActionState(createStaffAccount, initialState);

  if (state.success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="mb-2 text-base font-semibold text-emerald-800">
          Compte staff créé pour {state.success.email}
        </h2>
        <p className="mb-4 text-sm text-emerald-700">
          Transmettez ce lien à votre collègue (ou faites-lui scanner le QR
          code) pour qu&apos;il active son accès et choisisse son mot de passe.
        </p>
        <div className="rounded-md bg-white p-4">
          <InvitePanel inviteUrl={state.success.inviteUrl} qrSvg={state.success.qrSvg} />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-lg border border-ink-100 bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="collegue@transakauto.fr"
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
