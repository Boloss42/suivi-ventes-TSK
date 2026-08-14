"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import type { VehicleActionState } from "@/lib/actions/vehicles";
import { deletePhoto } from "@/lib/actions/vehicles";
import { vehicleStatusLabels } from "@/lib/format";
import InvitePanel from "@/components/InvitePanel";

type ClientOption = { id: string; firstName: string; lastName: string };
type ListingUrlValue = { label: string; url: string };
type ExistingPhoto = { id: string; url: string };

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

const inputClass =
  "w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelClass = "mb-1 block text-sm font-medium text-ink-800";

export default function VehicleForm({
  action,
  submitLabel,
  clients,
  defaultValues,
  defaultClientId,
  vehicleId,
  existingPhotos,
  allowNewClient = false,
}: {
  action: (state: VehicleActionState, formData: FormData) => Promise<VehicleActionState>;
  submitLabel: string;
  clients: ClientOption[];
  defaultValues?: {
    clientId: string;
    make: string;
    model: string;
    year: number;
    mileage: number;
    fuelType: string;
    reference: string;
    price: number;
    advisedPrice: number | null;
    status: string;
    depositDate: string;
    listingUrls: ListingUrlValue[];
  };
  defaultClientId?: string;
  vehicleId?: string;
  existingPhotos?: ExistingPhoto[];
  allowNewClient?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const [listingUrls, setListingUrls] = useState<ListingUrlValue[]>(
    defaultValues?.listingUrls.length ? defaultValues.listingUrls : [{ label: "", url: "" }],
  );
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");

  if (state.success) {
    return (
      <div className="max-w-xl rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="mb-2 text-base font-semibold text-emerald-800">
          Véhicule créé avec succès
        </h2>

        {state.success.newClient && (
          <>
            <p className="mb-4 text-sm text-emerald-700">
              Un nouveau profil client a été créé. Transmettez-lui ce lien (ou
              faites-lui scanner le QR code) pour qu&apos;il active son espace
              et choisisse son mot de passe.
            </p>
            <div className="mb-4 rounded-md bg-white p-4">
              <InvitePanel
                inviteUrl={state.success.newClient.inviteUrl}
                qrSvg={state.success.newClient.qrSvg}
              />
            </div>
          </>
        )}

        {state.success.photoError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {state.success.photoError}
          </p>
        )}

        <Link
          href={`/staff/vehicles/${state.success.vehicleId}`}
          className="inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Voir la fiche du véhicule
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <div className="grid gap-4 rounded-lg border border-ink-100 bg-white p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <label className={labelClass}>Client propriétaire</label>
            {allowNewClient && (
              <div className="flex gap-1 rounded-md border border-ink-200 p-0.5 text-sm">
                <button
                  type="button"
                  onClick={() => setClientMode("existing")}
                  className={`rounded px-3 py-1 font-medium transition ${
                    clientMode === "existing"
                      ? "bg-brand-500 text-white"
                      : "text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  Client existant
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("new")}
                  className={`rounded px-3 py-1 font-medium transition ${
                    clientMode === "new"
                      ? "bg-brand-500 text-white"
                      : "text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  + Nouveau client
                </button>
              </div>
            )}
          </div>

          {clientMode === "existing" ? (
            <select
              name="clientId"
              required
              defaultValue={defaultValues?.clientId ?? defaultClientId ?? ""}
              className={inputClass}
            >
              <option value="" disabled>
                Sélectionner un client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-3 rounded-md border border-ink-100 bg-ink-50 p-4">
              <input type="hidden" name="clientMode" value="new" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-600">Prénom</label>
                  <input
                    name="newClientFirstName"
                    required={clientMode === "new"}
                    className={`${inputClass} bg-white`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-600">Nom</label>
                  <input
                    name="newClientLastName"
                    required={clientMode === "new"}
                    className={`${inputClass} bg-white`}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Email</label>
                <input
                  name="newClientEmail"
                  type="email"
                  required={clientMode === "new"}
                  className={`${inputClass} bg-white`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">
                  Téléphone <span className="font-normal text-ink-400">(optionnel)</span>
                </label>
                <input name="newClientPhone" className={`${inputClass} bg-white`} />
              </div>
              <p className="text-xs text-ink-500">
                Un lien d&apos;activation (+ QR code) sera généré à la création
                du véhicule, pour que ce client active son espace.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Marque</label>
          <input name="make" required defaultValue={defaultValues?.make} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Modèle</label>
          <input name="model" required defaultValue={defaultValues?.model} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Année</label>
          <input
            name="year"
            type="number"
            required
            defaultValue={defaultValues?.year}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Kilométrage</label>
          <input
            name="mileage"
            type="number"
            required
            defaultValue={defaultValues?.mileage}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Motorisation</label>
          <input
            name="fuelType"
            required
            placeholder="Essence, Diesel, Hybride, Électrique..."
            defaultValue={defaultValues?.fuelType}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Immatriculation / référence</label>
          <input
            name="reference"
            required
            defaultValue={defaultValues?.reference}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Prix net vendeur (€)</label>
          <input
            name="price"
            type="number"
            required
            defaultValue={defaultValues?.price}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Prix de conseil (€) <span className="font-normal text-ink-400">(optionnel)</span>
          </label>
          <input
            name="advisedPrice"
            type="number"
            min={0}
            defaultValue={defaultValues?.advisedPrice ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-400">
            Prix auquel vous estimez que le véhicule devrait se vendre. Affiché au client comme repère.
          </p>
        </div>
        <div>
          <label className={labelClass}>Statut</label>
          <select name="status" defaultValue={defaultValues?.status ?? "EN_VENTE"} className={inputClass}>
            {Object.entries(vehicleStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Date de mise en dépôt</label>
          <input
            name="depositDate"
            type="date"
            required
            defaultValue={defaultValues?.depositDate}
            className={inputClass}
          />
        </div>
      </div>

      <div className="rounded-lg border border-ink-100 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-800">Liens vers l&apos;annonce</h3>
          <button
            type="button"
            onClick={() => setListingUrls((v) => [...v, { label: "", url: "" }])}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            + Ajouter un lien
          </button>
        </div>
        <div className="space-y-3">
          {listingUrls.map((entry, i) => (
            <div key={i} className="flex gap-3">
              <input
                name="listingLabel"
                placeholder="LeBonCoin, La Centrale..."
                defaultValue={entry.label}
                className={`${inputClass} w-40 shrink-0`}
              />
              <input
                name="listingUrl"
                placeholder="https://..."
                defaultValue={entry.url}
                className={inputClass}
              />
              {listingUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => setListingUrls((v) => v.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-md border border-ink-200 px-3 text-sm text-ink-500 hover:bg-ink-50"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-ink-100 bg-white p-6">
        <h3 className="mb-3 text-sm font-semibold text-ink-800">Photos</h3>

        {existingPhotos && existingPhotos.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-md border border-ink-100">
                <Image src={photo.url} alt="" fill className="object-cover" />
                <form action={deletePhoto} className="absolute right-1 top-1">
                  <input type="hidden" name="photoId" value={photo.id} />
                  <input type="hidden" name="vehicleId" value={vehicleId} />
                  <button
                    type="submit"
                    className="rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    Suppr.
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <input
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-md file:border-0 file:bg-ink-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-800 hover:file:bg-ink-200"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
