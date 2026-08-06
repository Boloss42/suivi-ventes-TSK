import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatPrice, formatMileage } from "@/lib/format";
import { currentWeekStart, formatWeekLabel } from "@/lib/week";
import { respondToPriceProposal } from "@/lib/actions/priceProposals";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { agencyId } = await requireStaff();
  const { id } = await params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, agencyId },
    include: {
      client: true,
      photos: { orderBy: { order: "asc" } },
      listingUrls: true,
      weeklyStats: { orderBy: { weekStart: "desc" } },
    },
  });

  if (!vehicle) notFound();

  const priceProposals = await prisma.priceProposal.findMany({
    where: { vehicleId: id },
    orderBy: { createdAt: "desc" },
  });

  const thisWeek = currentWeekStart();
  const hasThisWeekStat = vehicle.weeklyStats.some(
    (s) => s.weekStart.getTime() === thisWeek.getTime(),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink-900">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </h1>
            <StatusBadge status={vehicle.status} />
          </div>
          <p className="text-sm text-ink-500">
            Propriétaire :{" "}
            <Link href={`/staff/clients/${vehicle.clientId}`} className="text-brand-700 hover:underline">
              {vehicle.client.firstName} {vehicle.client.lastName}
            </Link>
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/staff/vehicles/${vehicle.id}/edit`}
            className="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-white"
          >
            Modifier
          </Link>
          <Link
            href={`/staff/vehicles/${vehicle.id}/stats/new`}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Saisir un relevé
          </Link>
        </div>
      </div>

      {vehicle.status === "EN_VENTE" && !hasThisWeekStat && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aucun relevé saisi pour {formatWeekLabel(thisWeek).toLowerCase()}.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Caractéristiques</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Kilométrage" value={formatMileage(vehicle.mileage)} />
              <Row label="Motorisation" value={vehicle.fuelType} />
              <Row label="Référence" value={vehicle.reference} />
              <Row label="Prix net vendeur" value={formatPrice(vehicle.price)} />
              <Row label="Mise en dépôt" value={formatDate(vehicle.depositDate)} />
            </dl>
          </div>

          {priceProposals.length > 0 && (
            <div className="rounded-lg border border-ink-100 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold text-ink-800">
                Propositions de prix du client
              </h2>
              <ul className="space-y-3">
                {priceProposals.map((proposal) => (
                  <li
                    key={proposal.id}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      proposal.status === "PENDING"
                        ? "border-amber-200 bg-amber-50"
                        : "border-ink-100 bg-ink-50"
                    }`}
                  >
                    <p className="font-medium text-ink-900">
                      {formatPrice(proposal.proposedPrice)}
                      <span className="ml-2 text-xs font-normal text-ink-500">
                        {formatDate(proposal.createdAt)}
                      </span>
                    </p>
                    {proposal.message && (
                      <p className="mt-1 text-ink-600">« {proposal.message} »</p>
                    )}
                    {proposal.status === "PENDING" ? (
                      <div className="mt-2 flex gap-2">
                        <form action={respondToPriceProposal.bind(null, proposal.id, "ACCEPTED")}>
                          <button
                            type="submit"
                            className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                          >
                            Accepter
                          </button>
                        </form>
                        <form action={respondToPriceProposal.bind(null, proposal.id, "REJECTED")}>
                          <button
                            type="submit"
                            className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-white"
                          >
                            Refuser
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-ink-500">
                        {proposal.status === "ACCEPTED" ? "Acceptée" : "Refusée"}
                        {proposal.respondedAt ? ` le ${formatDate(proposal.respondedAt)}` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {vehicle.listingUrls.length > 0 && (
            <div className="rounded-lg border border-ink-100 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold text-ink-800">Annonces</h2>
              <ul className="space-y-2 text-sm">
                {vehicle.listingUrls.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-700 hover:underline"
                    >
                      {l.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {vehicle.photos.length > 0 && (
            <div className="rounded-lg border border-ink-100 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold text-ink-800">Photos</h2>
              <div className="grid grid-cols-3 gap-2">
                {vehicle.photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square overflow-hidden rounded-md border border-ink-100">
                    <Image src={photo.url} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-lg border border-ink-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink-800">
            Historique des relevés ({vehicle.weeklyStats.length})
          </h2>

          {vehicle.weeklyStats.length === 0 ? (
            <p className="text-sm text-ink-400">Aucun relevé saisi pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-100 text-ink-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Semaine</th>
                    <th className="py-2 pr-4 font-medium">Vues</th>
                    <th className="py-2 pr-4 font-medium">Contacts</th>
                    <th className="py-2 pr-4 font-medium">Appels</th>
                    <th className="py-2 pr-4 font-medium">Favoris</th>
                    <th className="py-2 pr-4 font-medium">Visites</th>
                    <th className="py-2 pr-4 font-medium">Offres</th>
                    <th className="py-2 pr-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.weeklyStats.map((stat) => (
                    <tr key={stat.id} className="border-b border-ink-50 last:border-0">
                      <td className="py-2 pr-4 text-ink-800">{formatDate(stat.weekStart)}</td>
                      <td className="py-2 pr-4 text-ink-600">{stat.views}</td>
                      <td className="py-2 pr-4 text-ink-600">{stat.contacts}</td>
                      <td className="py-2 pr-4 text-ink-600">{stat.calls}</td>
                      <td className="py-2 pr-4 text-ink-600">{stat.favorites}</td>
                      <td className="py-2 pr-4 text-ink-600">{stat.visits}</td>
                      <td className="py-2 pr-4 text-ink-600">{stat.offers}</td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/staff/vehicles/${vehicle.id}/stats/${stat.id}/edit`}
                          className="text-brand-700 hover:underline"
                        >
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  );
}
