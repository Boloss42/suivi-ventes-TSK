"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  regenerateStaffInviteLink,
  deleteStaffAccount,
  type StaffInviteLinkState,
} from "@/lib/actions/staffAccounts";
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
      {pending ? "Génération..." : "Générer un lien d'activation"}
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

export default function StaffRow({
  userId,
  email,
  createdAt,
  isPending,
  isSelf,
  canDelete,
}: {
  userId: string;
  email: string;
  createdAt: string;
  isPending: boolean;
  isSelf: boolean;
  canDelete: boolean;
}) {
  const [state, formAction] = useActionState<StaffInviteLinkState, FormData>(
    regenerateStaffInviteLink,
    {},
  );

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink-900">
            {email} {isSelf && <span className="text-xs font-normal text-ink-400">(vous)</span>}
          </p>
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
          {canDelete && !isSelf && (
            <form
              action={deleteStaffAccount}
              onSubmit={(e) => {
                if (!confirm(`Supprimer le compte staff ${email} ?`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="userId" value={userId} />
              <DeleteButton />
            </form>
          )}
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
