import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import VehicleThumbnail from "@/components/VehicleThumbnail";
import SearchField from "@/components/SearchField";
import DeleteVehicleButton from "./DeleteVehicleButton";
import { formatPrice, formatMileage, vehicleStatusLabels } from "@/lib/format";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { agencyId, userId } = await requireStaff();
  const { status, q } = await searchParams;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      agencyId,
      client: { assignedStaffId: userId },
      ...(status ? { status: status as "EN_VENTE" | "VENDU" | "RETIRE" } : {}),
      ...(q
        ? {
            OR: [
              { make: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { reference: { contains: q, mode: "insensitive" } },
              { client: { firstName: { contains: q, mode: "insensitive" } } },
              { client: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { client: true, photos: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const statusFilters = [
    { value: undefined, label: "Tous" },
    ...Object.entries(vehicleStatusLabels).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">Véhicules</h1>
        <Link
          href="/staff/vehicles/new"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          + Nouveau véhicule
        </Link>
      </div>

      <div className="mb-4">
        <SearchField placeholder="Rechercher un véhicule (marque, modèle, référence, client)..." />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const params = new URLSearchParams();
          if (filter.value) params.set("status", filter.value);
          if (q) params.set("q", q);
          const query = params.toString();
          return (
            <Link
              key={filter.label}
              href={query ? `/staff/vehicles?${query}` : "/staff/vehicles"}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                status === filter.value
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-ink-200 text-ink-600 hover:bg-white"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border border-ink-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-ink-600">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Véhicule</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Client</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Kilométrage</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Prix</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Statut</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <VehicleThumbnail
                        photoUrl={vehicle.photos[0]?.url}
                        alt={`${vehicle.make} ${vehicle.model}`}
                      />
                      <div>
                        <Link
                          href={`/staff/vehicles/${vehicle.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {vehicle.make} {vehicle.model} ({vehicle.year})
                        </Link>
                        <p className="text-xs text-ink-400">{vehicle.reference}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                    {vehicle.client.firstName} {vehicle.client.lastName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                    {formatMileage(vehicle.mileage)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                    {formatPrice(vehicle.price)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <DeleteVehicleButton
                      vehicleId={vehicle.id}
                      vehicleLabel={`${vehicle.make} ${vehicle.model} (${vehicle.reference})`}
                    />
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                    {q ? "Aucun véhicule ne correspond à cette recherche." : "Aucun véhicule."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
