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
      select: { assignedStaff: { select: { firstName: true, email: true, phone: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Mes véhicules</h1>

      {client?.assignedStaff && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-100 bg-white p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Votre conseillé
            </p>
            <p className="mt-1 text-sm font-medium text-ink-800">
              {client.assignedStaff.firstName || client.assignedStaff.email}
            </p>
            {client.assignedStaff.phone && (
              <a
                href={`tel:${client.assignedStaff.phone.replace(/\s+/g, "")}`}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                {client.assignedStaff.phone}
              </a>
            )}
          </div>
          {client.assignedStaff.phone && (
            <a
              href={`tel:${client.assignedStaff.phone.replace(/\s+/g, "")}`}
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Appeler
            </a>
          )}
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
