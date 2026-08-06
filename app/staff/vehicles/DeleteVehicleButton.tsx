"use client";

import { useState, useTransition } from "react";
import { deleteVehicle } from "@/lib/actions/vehicles";

export default function DeleteVehicleButton({
  vehicleId,
  vehicleLabel,
}: {
  vehicleId: string;
  vehicleLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    const reallySure = confirm(
      `Suppression définitive de « ${vehicleLabel} ». Cette action supprimera aussi son historique de relevés, ses photos et les propositions de prix associées, sans retour possible. Continuer ?`,
    );
    if (!reallySure) {
      setConfirming(false);
      return;
    }
    const formData = new FormData();
    formData.set("vehicleId", vehicleId);
    startTransition(() => {
      deleteVehicle(formData);
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "..." : "Confirmer"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-md border border-ink-200 px-2 py-1 text-xs font-medium text-ink-600 transition hover:bg-ink-50"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Supprimer ${vehicleLabel}`}
        title="Supprimer le véhicule"
        className="rounded-md p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
