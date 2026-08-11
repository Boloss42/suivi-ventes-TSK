"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  regenerateAgencyStaffInviteLink,
  deleteAgencyStaffAccount,
  type AgencyStaffInviteLinkState,
} from "@/lib/actions/agencies";
import InvitePanel from "@/components/InvitePanel";
import { formatDate } from "@/lib/format";

function RegenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-ink-50 disabled:opacity-60"
    >
      {pending ? "Envoi..." : "Renvoyer l'email d'activation"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "Suppression..." : "Supprimer"}
    </button>
  );
}

export default function AgencyStaffRow({
  agencyId,
  userId,
  email,
  createdAt,
  isPending,
}: {
  agencyId: string;
  userId: string;
  email: string;
  createdAt: string;
  isPending: boolean;
}) {
  const regenerateWithAgency = regenerateAgencyStaffInviteLink.bind(null, agencyId);
  const deleteWithAgency = deleteAgencyStaffAccount.bind(null, agencyId);
  const [state, formAction] = useActionState<AgencyStaffInviteLinkState, FormData>(
    regenerateWithAgency,
    {},
  );

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink-900">{email}</p>
          <p className="text-sm text-ink-500">
            {isPending ? "En attente d'activation" : "Actif"} — depuis le {formatDate(createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {isPending && (
            <form action={formAction}>
              <input type="hidden" name="userId" value={userId} />
              <RegenerateButton />
            </form>
          )}
          <form
            action={deleteWithAgency}
            onSubmit={(e) => {
              if (!confirm(`Supprimer le compte agent ${email} ?`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="userId" value={userId} />
            <DeleteButton />
          </form>
        </div>
      </div>

      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state.inviteUrl && state.qrSvg && (
        <div className="mt-3 rounded-md border border-ink-100 bg-ink-50 p-4">
          <InvitePanel inviteUrl={state.inviteUrl} qrSvg={state.qrSvg} />
        </div>
      )}
    </div>
  );
}
