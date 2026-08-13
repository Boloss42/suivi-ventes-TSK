"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { StatActionState } from "@/lib/actions/stats";
import type { ImportedStatValues } from "@/lib/actions/statsImport";
import StatImportPanel from "@/components/StatImportPanel";

const inputClass =
  "w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-sm font-medium text-ink-800";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : label}
    </button>
  );
}

// `name` correspond au champ envoyé (repris par le schéma Zod côté serveur) ;
// `importKey` relie le champ à la valeur extraite d'une capture LeBonCoin.
const COUNTER_FIELDS: { name: string; label: string; importKey?: keyof ImportedStatValues }[] = [
  { name: "views", label: "Apparitions de l'annonce", importKey: "views" },
  { name: "detailViews", label: "Vues de l'annonce", importKey: "detailViews" },
  { name: "contacts", label: "Contacts / messages", importKey: "contacts" },
  { name: "calls", label: "Appels téléphoniques", importKey: "calls" },
  { name: "favorites", label: "Mises en favori", importKey: "favorites" },
  { name: "visits", label: "Visites / essais" },
  { name: "offers", label: "Offres reçues" },
];

type StatDefaults = {
  weekStart: string;
  views: number;
  detailViews: number;
  contacts: number;
  calls: number;
  favorites: number;
  visits: number;
  offers: number;
  note: string;
};

export default function StatForm({
  action,
  submitLabel,
  vehicleId,
  defaultValues,
  showImport = false,
}: {
  action: (state: StatActionState, formData: FormData) => Promise<StatActionState>;
  submitLabel: string;
  vehicleId: string;
  defaultValues?: StatDefaults;
  // Affiche le panneau d'import depuis une capture LeBonCoin (page « Nouveau relevé »).
  showImport?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});

  // Champs contrôlés (en chaînes, pour une saisie souple) — permet de les
  // pré-remplir depuis une capture importée. Le `name` reste posé sur chaque
  // input, donc l'envoi du formulaire fonctionne comme avant.
  const [fields, setFields] = useState<Record<string, string>>({
    weekStart: defaultValues?.weekStart ?? "",
    views: String(defaultValues?.views ?? 0),
    detailViews: String(defaultValues?.detailViews ?? 0),
    contacts: String(defaultValues?.contacts ?? 0),
    calls: String(defaultValues?.calls ?? 0),
    favorites: String(defaultValues?.favorites ?? 0),
    visits: String(defaultValues?.visits ?? 0),
    offers: String(defaultValues?.offers ?? 0),
    note: defaultValues?.note ?? "",
  });

  const setField = (name: string, value: string) =>
    setFields((f) => ({ ...f, [name]: value }));

  const applyImported = (values: ImportedStatValues) =>
    setFields((f) => {
      const next = { ...f };
      for (const [key, val] of Object.entries(values)) {
        if (val != null) next[key] = String(val);
      }
      return next;
    });

  return (
    <div className="max-w-xl space-y-6">
      {showImport && <StatImportPanel onExtracted={applyImported} />}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="vehicleId" value={vehicleId} />

        <div className="rounded-lg border border-ink-100 bg-white p-6">
          <label className={labelClass}>Semaine concernée</label>
          <input
            name="weekStart"
            type="date"
            required
            value={fields.weekStart}
            onChange={(e) => setField("weekStart", e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-400">
            Toute date de la semaine convient : elle est automatiquement ramenée au lundi.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg border border-ink-100 bg-white p-6">
          {COUNTER_FIELDS.map((field) => (
            <div key={field.name}>
              <label className={labelClass}>{field.label}</label>
              <input
                name={field.name}
                type="number"
                min={0}
                value={fields[field.name]}
                onChange={(e) => setField(field.name, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-ink-100 bg-white p-6">
          <label className={labelClass}>
            Note / commentaire <span className="font-normal text-ink-400">(optionnel)</span>
          </label>
          <textarea
            name="note"
            rows={3}
            value={fields.note}
            onChange={(e) => setField("note", e.target.value)}
            className={inputClass}
          />
        </div>

        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <SubmitButton label={submitLabel} />
      </form>
    </div>
  );
}
