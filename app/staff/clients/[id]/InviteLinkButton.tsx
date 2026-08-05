"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { regenerateInviteLink, type InviteLinkState } from "@/lib/actions/clients";
import InvitePanel from "@/components/InvitePanel";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-ink-50 disabled:opacity-60"
    >
      {pending ? "Génération..." : "Générer un lien d'activation"}
    </button>
  );
}

export default function InviteLinkButton({ clientId }: { clientId: string }) {
  const [state, formAction] = useActionState<InviteLinkState, FormData>(
    regenerateInviteLink,
    {},
  );

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="clientId" value={clientId} />
        <SubmitButton />
      </form>
      {state.inviteUrl && state.qrSvg && (
        <div className="mt-3 rounded-md border border-ink-100 bg-ink-50 p-4">
          <InvitePanel inviteUrl={state.inviteUrl} qrSvg={state.qrSvg} />
        </div>
      )}
      {state.error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
    </div>
  );
}
