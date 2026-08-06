import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { currentWeekStart, formatWeekLabel } from "@/lib/week";
import { formatPrice, formatMileage } from "@/lib/format";
import VehicleThumbnail from "@/components/VehicleThumbnail";

export default async function StaffDashboardPage() {
  const { agencyId } = await requireStaff();
  const thisWeek = currentWeekStart();

  const [enVenteCount, venduCount, retireCount, clientCount, vehiclesEnVente] =
    await Promise.all([
      prisma.vehicle.count({ where: { agencyId, status: "EN_VENTE" } }),
      prisma.vehicle.count({ where: { agencyId, status: "VENDU" } }),
      prisma.vehicle.count({ where: { agencyId, status: "RETIRE" } }),
      prisma.client.count({ where: { agencyId } }),
      prisma.vehicle.findMany({
        where: { agencyId, status: "EN_VENTE" },
        include: {
          client: true,
          weeklyStats: { where: { weekStart: thisWeek } },
          photos: { orderBy: { order: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const missingThisWeek = vehiclesEnVente.filter((v) => v.weeklyStats.length === 0);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Tableau de bord</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Véhicules en vente" value={enVenteCount} />
        <KpiCard label="Véhicules vendus" value={venduCount} />
        <KpiCard label="Véhicules retirés" value={retireCount} />
        <KpiCard label="Clients" value={clientCount} />
      </div>

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
            {vehiclesEnVente.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/staff/vehicles/${vehicle.id}`}
                className="flex items-center gap-3 rounded-lg border border-ink-100 bg-white p-3 transition hover:border-brand-300"
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

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-5">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
