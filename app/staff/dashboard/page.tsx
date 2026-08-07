import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { currentWeekStart, formatWeekLabel } from "@/lib/week";
import { formatPrice, formatMileage } from "@/lib/format";
import { respondToPriceProposal } from "@/lib/actions/priceProposals";
import VehicleThumbnail from "@/components/VehicleThumbnail";

export default async function StaffDashboardPage() {
  const { agencyId, userId } = await requireStaff();
  const thisWeek = currentWeekStart();
  const ownClient = { assignedStaffId: userId };

  const [
    enVenteCount,
    venduCount,
    retireCount,
    clientCount,
    vehiclesEnVente,
    pendingProposals,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { agencyId, status: "EN_VENTE", client: ownClient } }),
    prisma.vehicle.count({ where: { agencyId, status: "VENDU", client: ownClient } }),
    prisma.vehicle.count({ where: { agencyId, status: "RETIRE", client: ownClient } }),
    prisma.client.count({ where: { agencyId, assignedStaffId: userId } }),
    prisma.vehicle.findMany({
      where: { agencyId, status: "EN_VENTE", client: ownClient },
      include: {
        client: true,
        weeklyStats: { where: { weekStart: thisWeek } },
        photos: { orderBy: { order: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.priceProposal.findMany({
      where: {
        status: "PENDING",
        vehicle: { agencyId, client: { assignedStaffId: userId } },
      },
      include: {
        vehicle: { select: { id: true, make: true, model: true, year: true, price: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const missingThisWeek = vehiclesEnVente.filter((v) => v.weeklyStats.length === 0);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Tableau de bord</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Véhicules en vente" value={enVenteCount} accent="brand" index={0} />
        <KpiCard label="Véhicules vendus" value={venduCount} accent="emerald" index={1} />
        <KpiCard label="Véhicules retirés" value={retireCount} accent="ink" index={2} />
        <KpiCard label="Clients" value={clientCount} accent="blue" index={3} />
      </div>

      {pendingProposals.length > 0 && (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-1 text-sm font-semibold text-ink-800">
            Propositions de baisse de prix
          </h2>
          <p className="mb-4 text-sm text-ink-500">
            Vos clients attendent votre réponse.
          </p>

          <ul className="space-y-3">
            {pendingProposals.map((proposal) => (
              <li
                key={proposal.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">
                    {proposal.client.firstName} {proposal.client.lastName}
                  </p>
                  <p className="text-sm text-ink-500">
                    {proposal.vehicle.make} {proposal.vehicle.model} ({proposal.vehicle.year})
                  </p>
                  <p className="mt-1 text-sm text-ink-700">
                    de {formatPrice(proposal.vehicle.price)} → {" "}
                    <span className="font-medium text-ink-900">
                      {formatPrice(proposal.proposedPrice)}
                    </span>
                  </p>
                  {proposal.message && (
                    <p className="mt-1 text-sm text-ink-600">« {proposal.message} »</p>
                  )}
                </div>
                <div className="flex gap-2">
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
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-8 rounded-lg border border-ink-100 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink-800">
          Relevés manquants — {formatWeekLabel(thisWeek)}
        </h2>
        <p className="mb-4 text-sm text-ink-500">
          Véhicules en vente sans statistiques saisies pour la semaine en cours.
        </p>

        {missingThisWeek.length === 0 ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Tous les relevés de la semaine sont à jour.
          </p>
        ) : (
          <ul className="divide-y divide-brand-50">
            {missingThisWeek.map((vehicle) => (
              <li key={vehicle.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <VehicleThumbnail
                    photoUrl={vehicle.photos[0]?.url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                  />
                  <div>
                    <p className="font-medium text-ink-900">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </p>
                    <p className="text-sm text-ink-500">
                      {vehicle.client.firstName} {vehicle.client.lastName}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/staff/vehicles/${vehicle.id}/stats/new`}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Saisir le relevé
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-800">
          Véhicules en vente ({vehiclesEnVente.length})
        </h2>

        {vehiclesEnVente.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-400">
            Aucun véhicule en vente pour le moment.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehiclesEnVente.map((vehicle, i) => (
              <Link
                key={vehicle.id}
                href={`/staff/vehicles/${vehicle.id}`}
                style={{ animationDelay: `${i * 60}ms` }}
                className="card-lift animate-rise flex items-center gap-3 rounded-lg border border-ink-100 bg-white p-3 hover:border-brand-300"
              >
                <VehicleThumbnail
                  photoUrl={vehicle.photos[0]?.url}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  size={64}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                  </p>
                  <p className="truncate text-sm text-ink-500">
                    {vehicle.client.firstName} {vehicle.client.lastName} ·{" "}
                    {formatMileage(vehicle.mileage)}
                  </p>
                  <p className="text-sm font-medium text-brand-700">
                    {formatPrice(vehicle.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const KPI_ACCENTS = {
  brand: "bg-brand-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  ink: "bg-ink-300",
} as const;

function KpiCard({
  label,
  value,
  accent = "brand",
  index = 0,
}: {
  label: string;
  value: number;
  accent?: keyof typeof KPI_ACCENTS;
  index?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${index * 70}ms` }}
      className="card-lift animate-rise relative overflow-hidden rounded-lg border border-ink-100 bg-white p-5"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${KPI_ACCENTS[accent]}`} />
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
