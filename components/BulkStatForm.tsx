"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createWeeklyStatsBulk, type BulkStatActionState } from "@/lib/actions/stats";
import { importStatsFromScreenshot, type ImportedStatValues } from "@/lib/actions/statsImport";

type VehicleOption = {
  id: string;
  make: string;
  model: string;
  reference: string;
  clientName: string;
};

// Compteurs saisissables ; `importKey` relie le champ à la valeur extraite
// d'une capture LeBonCoin (Visites et Offres n'y figurent pas).
const COUNTER_FIELDS: {
  name: keyof RowValues;
  label: string;
  short: string;
  importKey?: keyof ImportedStatValues;
}[] = [
  { name: "views", label: "Apparitions", short: "Appar.", importKey: "views" },
  { name: "detailViews", label: "Vues", short: "Vues", importKey: "detailViews" },
  { name: "contacts", label: "Contacts", short: "Contacts", importKey: "contacts" },
  { name: "calls", label: "Appels", short: "Appels", importKey: "calls" },
  { name: "favorites", label: "Favoris", short: "Favoris", importKey: "favorites" },
  { name: "visits", label: "Visites", short: "Visites" },
  { name: "offers", label: "Offres", short: "Offres" },
];

type RowValues = {
  views: string;
  detailViews: string;
  contacts: string;
  calls: string;
  favorites: string;
  visits: string;
  offers: string;
  note: string;
};

const emptyRow = (): RowValues => ({
  views: "",
  detailViews: "",
  contacts: "",
  calls: "",
  favorites: "",
  visits: "",
  offers: "",
  note: "",
});

// Une ligne « vide » (aucun compteur ni note renseigné) est ignorée à l'envoi.
function isRowEmpty(r: RowValues): boolean {
  return (
    !r.views.trim() &&
    !r.detailViews.trim() &&
    !r.contacts.trim() &&
    !r.calls.trim() &&
    !r.favorites.trim() &&
    !r.visits.trim() &&
    !r.offers.trim() &&
    !r.note.trim()
  );
}

type ImportStatus = { loading: boolean; error?: string; done?: boolean };

const inputClass =
  "w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="rounded-md bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending
        ? "Enregistrement..."
        : `Enregistrer ${count} relevé${count > 1 ? "s" : ""}`}
    </button>
  );
}

export default function BulkStatForm({
  vehicles,
  defaultWeekStart,
}: {
  vehicles: VehicleOption[];
  defaultWeekStart: string;
}) {
  const [state, formAction] = useActionState<BulkStatActionState, FormData>(
    createWeeklyStatsBulk,
    {},
  );

  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [search, setSearch] = useState("");
  // Ordre de sélection : détermine l'ordre des lignes à remplir.
  const [selected, setSelected] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, RowValues>>({});
  const [imports, setImports] = useState<Record<string, ImportStatus>>({});

  const errorsById = useMemo(() => {
    const m = new Map<string, string>();
    state.rowErrors?.forEach((e) => m.set(e.vehicleId, e.message));
    return m;
  }, [state.rowErrors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      `${v.make} ${v.model} ${v.reference} ${v.clientName}`.toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles],
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setValues((prev) => (prev[id] ? prev : { ...prev, [id]: emptyRow() }));
  }

  function setField(id: string, field: keyof RowValues, value: string) {
    setValues((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyRow()), [field]: value } }));
  }

  function applyImported(id: string, imported: ImportedStatValues) {
    setValues((prev) => {
      const next = { ...(prev[id] ?? emptyRow()) };
      for (const [key, val] of Object.entries(imported)) {
        if (val != null) next[key as keyof RowValues] = String(val);
      }
      return { ...prev, [id]: next };
    });
  }

  async function handleImport(id: string, file: File) {
    setImports((p) => ({ ...p, [id]: { loading: true } }));
    const fd = new FormData();
    fd.set("screenshot", file);
    const res = await importStatsFromScreenshot({}, fd);
    if (res.error) {
      setImports((p) => ({ ...p, [id]: { loading: false, error: res.error } }));
    } else if (res.values) {
      applyImported(id, res.values);
      setImports((p) => ({ ...p, [id]: { loading: false, done: true } }));
    } else {
      setImports((p) => ({ ...p, [id]: { loading: false } }));
    }
  }

  // Lignes réellement envoyées : sélectionnées et non vides.
  const rowsToSend = selected
    .filter((id) => values[id] && !isRowEmpty(values[id]))
    .map((id) => ({ vehicleId: id, ...values[id] }));

  const emptySelectedCount = selected.filter(
    (id) => !values[id] || isRowEmpty(values[id]),
  ).length;

  if (state.success && state.success.created > 0 && !state.rowErrors) {
    const n = state.success.created;
    return (
      <div className="max-w-xl rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="mb-2 text-base font-semibold text-emerald-800">
          {n} relevé{n > 1 ? "s" : ""} enregistré{n > 1 ? "s" : ""}
        </h2>
        <p className="mb-4 text-sm text-emerald-700">
          Les clients concernés ont été notifiés. Vous pouvez consulter chaque
          fiche véhicule pour vérifier le diagnostic.
        </p>
        <Link
          href="/staff/vehicles"
          className="inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Voir la liste des véhicules
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="weekStart" value={weekStart} />
      <input type="hidden" name="rows" value={JSON.stringify(rowsToSend)} />

      {/* Semaine commune à tout le lot */}
      <div className="max-w-sm rounded-lg border border-ink-100 bg-white p-5">
        <label className="mb-1 block text-sm font-medium text-ink-800">
          Semaine concernée (commune à tout le lot)
        </label>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          required
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-400">
          Toute date de la semaine convient : elle est ramenée au lundi.
        </p>
      </div>

      {/* 1. Sélection des véhicules */}
      <div className="rounded-lg border border-ink-100 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-800">
            1. Véhicules à relever
          </h2>
          <span className="text-xs text-ink-400">{selected.length} sélectionné{selected.length > 1 ? "s" : ""}</span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (marque, modèle, référence, client)…"
          className={`${inputClass} mb-3`}
        />
        <div className="max-h-64 overflow-y-auto rounded-md border border-ink-100">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink-400">Aucun véhicule ne correspond.</p>
          ) : (
            filtered.map((v) => (
              <label
                key={v.id}
                className="flex cursor-pointer items-center gap-3 border-b border-ink-50 px-3 py-2 text-sm last:border-b-0 hover:bg-ink-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(v.id)}
                  onChange={() => toggle(v.id)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="font-medium text-ink-800">
                  {v.make} {v.model}
                </span>
                <span className="text-ink-400">· {v.reference}</span>
                <span className="ml-auto text-ink-400">{v.clientName}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* 2. Saisie des relevés */}
      {selected.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-800">2. Chiffres de la semaine</h2>
          {selected.map((id) => {
            const v = vehicleById.get(id);
            if (!v) return null;
            const row = values[id] ?? emptyRow();
            const imp = imports[id];
            const rowError = errorsById.get(id);
            return (
              <div
                key={id}
                className={`rounded-lg border p-4 ${rowError ? "border-red-200 bg-red-50" : "border-ink-100 bg-white"}`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-semibold text-ink-800">
                      {v.make} {v.model}
                    </span>
                    <span className="text-ink-400"> · {v.reference} · {v.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      {imp?.loading ? "Lecture…" : "Capture LBC"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        className="sr-only"
                        disabled={imp?.loading}
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0];
                          if (file) handleImport(id, file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-500 hover:bg-ink-50"
                      aria-label={`Retirer ${v.make} ${v.model}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {COUNTER_FIELDS.map((f) => (
                    <div key={f.name}>
                      <label className="mb-0.5 block text-xs font-medium text-ink-500">
                        {f.short}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={row[f.name]}
                        onChange={(e) => setField(id, f.name, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>

                {imp?.done && !imp.error && (
                  <p className="mt-2 text-xs text-emerald-700">Chiffres importés depuis la capture — vérifiez puis complétez Visites / Offres.</p>
                )}
                {imp?.error && (
                  <p className="mt-2 text-xs text-red-600">{imp.error}</p>
                )}
                {rowError && <p className="mt-2 text-xs text-red-600">{rowError}</p>}
              </div>
            );
          })}
        </div>
      )}

      {emptySelectedCount > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {emptySelectedCount} véhicule{emptySelectedCount > 1 ? "s" : ""} sélectionné
          {emptySelectedCount > 1 ? "s" : ""} sans aucun chiffre : {emptySelectedCount > 1 ? "ils seront ignorés" : "il sera ignoré"} à l&apos;enregistrement.
        </p>
      )}

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && state.success.created > 0 && state.rowErrors && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success.created} relevé{state.success.created > 1 ? "s" : ""} enregistré
          {state.success.created > 1 ? "s" : ""}. Corrigez les lignes signalées ci-dessus pour les relevés restants.
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton count={rowsToSend.length} />
        <Link href="/staff/vehicles" className="text-sm font-medium text-ink-500 hover:underline">
          Annuler
        </Link>
      </div>
    </form>
  );
}
