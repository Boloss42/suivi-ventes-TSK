"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestReview, type RequestReviewState } from "@/lib/actions/reviews";
import InvitePanel from "@/components/InvitePanel";
import { formatDate } from "@/lib/format";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="shrink-0 rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Génération..." : "Demander un avis"}
    </button>
  );
}

export default function ClientReviewRow({
  clientId,
  name,
  requestedAt,
  hasReviewUrl,
}: {
  clientId: string;
  name: string;
  requestedAt: string | null;
  hasReviewUrl: boolean;
}) {
  const [state, formAction] = useActionState<RequestReviewState, FormData>(
    requestReview,
    {},
  );

  return (
    <div className="py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-ink-900">{name}</p>
          <p className="text-sm text-ink-500">
            {requestedAt ? `Avis demandé le ${formatDate(requestedAt)}` : "Pas encore demandé"}
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="clientId" value={clientId} />
          <SubmitButton disabled={!hasReviewUrl} />
        </form>
      </div>

      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}

      {state.reviewUrl && state.qrSvg && (
        <div className="mt-3 rounded-md border border-ink-100 bg-ink-50 p-4">
          <InvitePanel
            inviteUrl={state.reviewUrl}
            qrSvg={state.qrSvg}
            label="Lien d'avis Google"
            caption="À transmettre au client par SMS, email ou tout autre moyen — ou lui faire scanner le QR code."
          />
        </div>
      )}
    </div>
  );
}
