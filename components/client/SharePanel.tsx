"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createShareLink, type ShareLinkState } from "@/lib/actions/share";
import InvitePanel from "@/components/InvitePanel";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="press inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {pending ? "Génération..." : "Partager mon annonce"}
    </button>
  );
}

export default function SharePanel({
  vehicleId,
  clickCount,
}: {
  vehicleId: string;
  clickCount: number;
}) {
  const [state, formAction] = useActionState<ShareLinkState, FormData>(createShareLink, {});

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold text-ink-800">Partager mon annonce</h2>
      <p className="mb-4 text-sm text-ink-500">
        Diffusez votre annonce à votre réseau : chaque visite via votre lien est comptabilisée.
        {clickCount > 0 && (
          <>
            {" "}
            <span className="font-medium text-ink-800">
              {clickCount} visite{clickCount > 1 ? "s" : ""}
            </span>{" "}
            à ce jour.
          </>
        )}
      </p>

      {state.shareUrl && state.qrSvg ? (
        <div className="rounded-md border border-ink-100 bg-ink-50 p-4">
          <InvitePanel
            inviteUrl={state.shareUrl}
            qrSvg={state.qrSvg}
            label="Lien de partage"
            caption="À diffuser par SMS, email, réseaux sociaux — ou à faire scanner."
          />
        </div>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <SubmitButton />
          {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
