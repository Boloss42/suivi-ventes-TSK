"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createVehiclesBulk, type BulkVehicleActionState } from "@/lib/actions/vehicles";
import { vehicleStatusLabels } from "@/lib/format";

type ClientOption = { id: string; firstName: string; lastName: string };

type Row = {
  clientId: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  fuelType: string;
  reference: string;
  price: string;
  advisedPrice: string;
  status: string;
  depositDate: string;
};

const emptyRow = (): Row => ({
  clientId: "",
  make: "",
  model: "",
  year: "",
  mileage: "",
  fuelType: "",
  reference: "",
  price: "",
  advisedPrice: "",
  status: "EN_VENTE",
  depositDate: "",
});

// Une ligne est « vide » si aucun champ saisissable n'est renseigné (le statut
// a une valeur par défaut, on l'ignore donc). Ces lignes sont écartées à
// l'envoi pour ne pas bloquer un lot où l'agent laisse des lignes inutilisées.
function isRowEmpty(row: Row): boolean {
  return (
    !row.clientId &&
    !row.make.trim() &&
    !row.model.trim() &&
    !row.year.trim() &&
    !row.mileage.trim() &&
    !row.fuelType.trim() &&
    !row.reference.trim() &&
    !row.price.trim() &&
    !row.advisedPrice.trim() &&
    !row.depositDate.trim()
  );
}

const cellInput =
  "w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const headCell = "px-2 py-2 text-left text-xs font-semibold text-ink-600 whitespace-nowrap";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : "Enregistrer les véhicules"}
    </button>
  );
}

export default function BulkVehicleForm({ clients }: { clients: ClientOption[] }) {
  const [state, formAction] = useActionState<BulkVehicleActionState, FormData>(
    createVehiclesBulk,
    {},
  );
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);

  // Lignes réellement envoyées (les vides sont écartées), en gardant l'index
  // d'origine pour rattacher correctement les erreurs serveur à la bonne ligne.
  const submitted = rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .filter(({ row }) => !isRowEmpty(row));

  // Regroupe les erreurs serveur (indexées sur le tableau envoyé) par index de
  // ligne d'origine, pour les afficher sous la bonne ligne du tableau.
  const errorsByIndex = new Map<number, string[]>();
  state.rowErrors?.forEach((e) => {
    const originalIndex = submitted[e.index]?.originalIndex ?? e.index;
    const list = errorsByIndex.get(originalIndex) ?? [];
    list.push(e.message);
    errorsByIndex.set(originalIndex, list);
  });

  function update(i: number, field: keyof Row, value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
  }
  function removeRow(i: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));
  }

  if (state.success) {
    const n = state.success.created;
    return (
      <div className="max-w-xl rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="mb-2 text-base font-semibold text-emerald-800">
          {n} véhicule{n > 1 ? "s" : ""} créé{n > 1 ? "s" : ""} avec succès
        </h2>
        <p className="mb-4 text-sm text-emerald-700">
          Vous pouvez maintenant ajouter les photos et les liens d&apos;annonce
          depuis chaque fiche véhicule.
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
    <form action={formAction} className="space-y-4">
      {/* Seules les lignes non vides sont transmises ; l'action serveur les valide. */}
      <input type="hidden" name="rows" value={JSON.stringify(submitted.map((s) => s.row))} />

      <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white">
        <table className="min-w-[1100px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100">
              <th className={headCell}>#</th>
              <th className={headCell}>Client</th>
              <th className={headCell}>Marque</th>
              <th className={headCell}>Modèle</th>
              <th className={headCell}>Année</th>
              <th className={headCell}>Km</th>
              <th className={headCell}>Motorisation</th>
              <th className={headCell}>Réf. / immat.</th>
              <th className={headCell}>Prix (€)</th>
              <th className={headCell}>Conseil (€)</th>
              <th className={headCell}>Statut</th>
              <th className={headCell}>Mise en dépôt</th>
              <th className={headCell}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rowErrors = errorsByIndex.get(i);
              const invalid = Boolean(rowErrors?.length);
              return (
                <tr
                  key={i}
                  className={`border-b border-ink-50 align-top ${invalid ? "bg-red-50" : ""}`}
                >
                  <td className="px-2 py-2 text-sm text-ink-400">{i + 1}</td>
                  <td className="px-2 py-2">
                    <select
                      value={row.clientId}
                      onChange={(e) => update(i, "clientId", e.target.value)}
                      className={`${cellInput} w-44`}
                    >
                      <option value="">— Client —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.make}
                      onChange={(e) => update(i, "make", e.target.value)}
                      className={`${cellInput} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.model}
                      onChange={(e) => update(i, "model", e.target.value)}
                      className={`${cellInput} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.year}
                      onChange={(e) => update(i, "year", e.target.value)}
                      className={`${cellInput} w-20`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.mileage}
                      onChange={(e) => update(i, "mileage", e.target.value)}
                      className={`${cellInput} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.fuelType}
                      onChange={(e) => update(i, "fuelType", e.target.value)}
                      placeholder="Diesel…"
                      className={`${cellInput} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.reference}
                      onChange={(e) => update(i, "reference", e.target.value)}
                      className={`${cellInput} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.price}
                      onChange={(e) => update(i, "price", e.target.value)}
                      className={`${cellInput} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.advisedPrice}
                      onChange={(e) => update(i, "advisedPrice", e.target.value)}
                      className={`${cellInput} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.status}
                      onChange={(e) => update(i, "status", e.target.value)}
                      className={`${cellInput} w-28`}
                    >
                      {Object.entries(vehicleStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={row.depositDate}
                      onChange={(e) => update(i, "depositDate", e.target.value)}
                      className={`${cellInput} w-36`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      className="rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-500 hover:bg-ink-50 disabled:opacity-40"
                      aria-label={`Retirer la ligne ${i + 1}`}
                    >
                      ✕
                    </button>
                    {rowErrors?.length ? (
                      <div className="mt-1 w-36 text-xs text-red-600">
                        {rowErrors.map((msg, k) => (
                          <p key={k}>{msg}</p>
                        ))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-ink-50"
        >
          + Ajouter une ligne
        </button>
        <span className="text-xs text-ink-400">{rows.length} / 50 véhicules</span>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link
          href="/staff/vehicles"
          className="text-sm font-medium text-ink-500 hover:underline"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
