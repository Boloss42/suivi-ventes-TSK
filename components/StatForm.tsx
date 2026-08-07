"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { StatActionState } from "@/lib/actions/stats";

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

const COUNTER_FIELDS: { name: string; label: string }[] = [
  { name: "views", label: "Apparitions de l'annonce" },
  { name: "contacts", label: "Contacts / messages" },
  { name: "calls", label: "Appels téléphoniques" },
  { name: "favorites", label: "Mises en favori" },
  { name: "visits", label: "Visites / essais" },
  { name: "offers", label: "Offres reçues" },
];

export default function StatForm({
  action,
  submitLabel,
  vehicleId,
  defaultValues,
}: {
  action: (state: StatActionState, formData: FormData) => Promise<StatActionState>;
  submitLabel: string;
  vehicleId: string;
  defaultValues?: {
    weekStart: string;
    views: number;
    contacts: number;
    calls: number;
    favorites: number;
    visits: number;
    offers: number;
    note: string;
  };
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="vehicleId" value={vehicleId} />

      <div className="rounded-lg border border-ink-100 bg-white p-6">
        <label className={labelClass}>Semaine concernée</label>
        <input
          name="weekStart"
          type="date"
          required
          defaultValue={defaultValues?.weekStart}
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
              defaultValue={defaultValues?.[field.name as keyof typeof defaultValues] ?? 0}
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
          defaultValue={defaultValues?.note}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
