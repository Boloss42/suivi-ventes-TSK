import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import { formatPrice, formatMileage } from "@/lib/format";

export default async function ClientDashboardPage() {
  const { clientId } = await requireClient();

  const [vehicles, client] = await Promise.all([
    prisma.vehicle.findMany({
      where: { clientId },
      include: { photos: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { assignedStaff: { select: { email: true, phone: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Mes véhicules</h1>

      {client?.assignedStaff && (
        <div className="mb-6 rounded-lg border border-ink-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Votre commercial
          </p>
          <p className="mt-1 text-sm text-ink-800">
            {client.assignedStaff.email}
            {client.assignedStaff.phone && (
              <>
                {" "}
                ·{" "}
                <a
                  href={`tel:${client.assignedStaff.phone.replace(/\s+/g, "")}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {client.assignedStaff.phone}
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {vehicles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-200 bg-white p-8 text-center text-ink-400">
          Aucun véhicule en dépôt pour le moment.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/client/vehicles/${vehicle.id}`}
              className="overflow-hidden rounded-lg border border-ink-100 bg-white transition hover:border-brand-300"
            >
              <div className="relative flex aspect-video items-center justify-center bg-ink-100 text-ink-300">
                {vehicle.photos[0] ? (
                  <Image src={vehicle.photos[0].url} alt="" fill className="object-cover" />
                ) : (
                  <span className="text-sm">Pas de photo</span>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-ink-900">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <StatusBadge status={vehicle.status} />
                </div>
                <p className="text-sm text-ink-500">
                  {vehicle.year} · {formatMileage(vehicle.mileage)}
                </p>
                <p className="mt-1 text-sm font-medium text-brand-700">
                  {formatPrice(vehicle.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
