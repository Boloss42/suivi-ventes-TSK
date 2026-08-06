"use client";

import { useState } from "react";

export default function InvitePanel({
  inviteUrl,
  qrSvg,
  label = "Lien d'activation",
  caption = "Valide 7 jours. À transmettre par SMS, email ou tout autre moyen — ou faire scanner le QR code ci-dessous.",
}: {
  inviteUrl: string;
  qrSvg: string;
  label?: string;
  caption?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permissions...) :
      // le lien reste sélectionnable manuellement dans le champ.
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-500">{label}</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
          >
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-400">{caption}</p>
      </div>
      <div
        className="flex justify-center rounded-md border border-ink-200 bg-white p-4"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </div>
  );
}
