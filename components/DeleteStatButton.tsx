"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteWeeklyStat } from "@/lib/actions/stats";

function SubmitButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "..." : "Confirmer"}
    </button>
  );
}

/**
 * Bouton de suppression d'un relevé hebdomadaire, avec confirmation intégrée
 * à l'interface (pas de window.confirm()) : cette API navigateur peut être
 * neutralisée en silence par un bloqueur de popups (elle renvoie alors
 * `false` sans jamais rien afficher), ce qui faisait échouer la suppression
 * sans la moindre trace pour l'agent.
 * `variant` : "link" pour un lien discret dans un tableau, "button" pour un
 * bouton plein (page d'édition).
 */
export default function DeleteStatButton({
  statId,
  variant = "link",
}: {
  statId: string;
  variant?: "link" | "button";
}) {
  const [confirming, setConfirming] = useState(false);

  const linkClass = variant === "button" ? "" : "text-red-600 hover:underline";
  const buttonClass =
    variant === "button"
      ? "rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
      : "text-red-600 hover:underline disabled:opacity-60";
  const cancelClass =
    variant === "button"
      ? "rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-50"
      : "text-ink-500 hover:underline";

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <form action={deleteWeeklyStat.bind(null, statId)}>
          <SubmitButton className={buttonClass} />
        </form>
        <button type="button" onClick={() => setConfirming(false)} className={cancelClass}>
          Annuler
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} className={linkClass || buttonClass}>
      Supprimer
    </button>
  );
}
