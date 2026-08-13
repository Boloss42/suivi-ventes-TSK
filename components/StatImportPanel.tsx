"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
  importStatsFromScreenshot,
  type ImportStatsState,
  type ImportedStatValues,
} from "@/lib/actions/statsImport";

const LABELS: Record<keyof ImportedStatValues, string> = {
  views: "Apparitions",
  detailViews: "Vues",
  favorites: "Favoris",
  contacts: "Contacts",
  calls: "Appels",
};

function Hint() {
  const { pending } = useFormStatus();
  return (
    <p className="mt-2 text-xs text-ink-400">
      {pending
        ? "Lecture de la capture en cours…"
        : "Astuce : sur LeBonCoin, sélectionnez la période « Tout » avant de photographier (nos relevés sont cumulés)."}
    </p>
  );
}

/**
 * Panneau d'import d'un relevé depuis une capture du tableau de bord LeBonCoin.
 * L'agent prend/choisit une photo → extraction des chiffres → `onExtracted`
 * pré-remplit le formulaire de relevé. Visites et Offres ne figurent pas sur
 * LeBonCoin : elles restent à saisir à la main.
 */
export default function StatImportPanel({
  onExtracted,
}: {
  onExtracted: (values: ImportedStatValues) => void;
}) {
  const [state, formAction] = useActionState<ImportStatsState, FormData>(
    importStatsFromScreenshot,
    {},
  );

  useEffect(() => {
    if (state.values) onExtracted(state.values);
    // On ne réagit qu'à un nouveau résultat d'extraction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-6">
      <h2 className="text-sm font-semibold text-ink-800">Importer depuis une capture LeBonCoin</h2>
      <p className="mt-1 text-sm text-ink-500">
        Prenez une photo (ou importez une capture) du tableau d&apos;activité de votre annonce :
        les chiffres remplissent le relevé automatiquement.
      </p>

      <form action={formAction} className="mt-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600">
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
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          Prendre / importer une capture
          <input
            type="file"
            name="screenshot"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
        </label>
        <Hint />
      </form>

      {state.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.values && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Chiffres importés (
          {(Object.keys(state.values) as (keyof ImportedStatValues)[])
            .map((k) => LABELS[k])
            .join(", ")}
          ). Vérifiez, complétez Visites / Offres, puis enregistrez.
        </p>
      )}
    </div>
  );
}
