import { clientStatusLabels, clientStatusStyles } from "@/lib/format";

/**
 * Badge « Actif / Inactif » d'un client. `active` = le client a encore au moins
 * un véhicule en vente. Statut calculé côté serveur, jamais stocké en base.
 */
export default function ClientStatusBadge({ active }: { active: boolean }) {
  const key = active ? "ACTIF" : "INACTIF";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${clientStatusStyles[key]}`}
    >
      {clientStatusLabels[key]}
    </span>
  );
}
