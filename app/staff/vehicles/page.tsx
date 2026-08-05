import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import VehicleThumbnail from "@/components/VehicleThumbnail";
import { formatPrice, formatMileage, vehicleStatusLabels } from "@/lib/format";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const vehicles = await prisma.vehicle.findMany({
    where: status ? { status: status as "EN_VENTE" | "VENDU" | "RETIRE" } : undefined,
    include: { client: true, photos: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const statusFilters = [
    { value: undefined, label: "Tous" },
    ...Object.entries(vehicleStatusLabels).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Véhicules</h1>
        <Link
          href="/staff/vehicles/new"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          + Nouveau véhicule
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {statusFilters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `/staff/vehicles?status=${filter.value}` : "/staff/vehicles"}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              status === filter.value
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-ink-200 text-ink-600 hover:bg-white"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-100 bg-ink-50 text-ink-600">
            <tr>
              <th className="px-4 py-3 font-medium">Véhicule</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Kilométrage</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr
                key={vehicle.id}
                className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60"
              >
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-ink-600">
                  {vehicle.client.firstName} {vehicle.client.lastName}
                </td>
                <td className="px-4 py-3 text-ink-600">{formatMileage(vehicle.mileage)}</td>
                <td className="px-4 py-3 text-ink-600">{formatPrice(vehicle.price)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={vehicle.status} />
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                  Aucun véhicule.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
