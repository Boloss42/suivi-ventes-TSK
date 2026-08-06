"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAgencyStaffAccount, type AgencyStaffState } from "@/lib/actions/agencies";
import InvitePanel from "@/components/InvitePanel";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Création..." : "Créer le compte"}
    </button>
  );
}

export default function NewAgencyStaffForm({
  agencyId,
  quotaReached,
}: {
  agencyId: string;
  quotaReached: boolean;
}) {
  const createWithAgency = createAgencyStaffAccount.bind(null, agencyId);
  const [state, formAction] = useActionState<AgencyStaffState, FormData>(createWithAgency, {});

  if (state.success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="mb-2 text-sm font-semibold text-emerald-800">
          Compte créé pour {state.success.email}
        </p>
        <p className="mb-3 text-xs text-emerald-700">
          Transmettez ce lien à l&apos;agent (ou faites-lui scanner le QR code) pour qu&apos;il
          active son accès et choisisse son mot de passe.
        </p>
        <div className="rounded-md bg-white p-4">
          <InvitePanel inviteUrl={state.success.inviteUrl} qrSvg={state.success.qrSvg} />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-ink-800">
          Email du nouvel agent
        </label>
        <input
          name="email"
          type="email"
          required
          disabled={quotaReached}
          placeholder="agent@exemple.fr"
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-ink-50"
        />
        {state.error && <p className="mt-1 text-sm text-red-700">{state.error}</p>}
        {quotaReached && !state.error && (
          <p className="mt-1 text-sm text-amber-700">
            Quota de comptes agents atteint pour cette agence. Augmentez-le ci-dessus pour en
            ajouter un.
          </p>
        )}
      </div>
      <SubmitButton disabled={quotaReached} />
    </form>
  );
}
