"use client";

import { deleteWeeklyStat } from "@/lib/actions/stats";

/**
 * Bouton de suppression d'un relevé hebdomadaire, avec confirmation.
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
  const className =
    variant === "button"
      ? "rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
      : "text-red-600 hover:underline";

  return (
    <form
      action={deleteWeeklyStat.bind(null, statId)}
      onSubmit={(e) => {
        if (!confirm("Supprimer ce relevé ? Cette action est définitive.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={className}>
        Supprimer
      </button>
    </form>
  );
}
