import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatMileage } from "@/lib/format";

// Page publique non authentifiée : à recalculer à chaque visite (compteur de
// clics), jamais mise en cache.
export const dynamic = "force-dynamic";

export default async function PublicListingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // On ne sélectionne QUE des informations non sensibles du véhicule : aucune
  // donnée personnelle du client, aucune statistique.
  const vehicle = await prisma.vehicle.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      mileage: true,
      fuelType: true,
      price: true,
      photos: { orderBy: { order: "asc" }, select: { id: true, url: true } },
      listingUrls: { select: { id: true, label: true, url: true } },
    },
  });

  if (!vehicle) notFound();

  // Enregistre le clic (mesure de la diffusion par le vendeur).
  await prisma.shareClick.create({ data: { vehicleId: vehicle.id } });

  return (
    <main className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <span className="text-base font-semibold text-brand-500">Mon suivi perso</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-2xl font-semibold text-ink-900">
          {vehicle.make} {vehicle.model}
        </h1>
        <p className="mb-6 text-ink-500">
          {vehicle.year} · {formatMileage(vehicle.mileage)} · {vehicle.fuelType}
        </p>

        {vehicle.photos.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-ink-100 bg-white">
              <Image src={vehicle.photos[0].url} alt="" fill className="object-cover" />
            </div>
            {vehicle.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {vehicle.photos.slice(1).map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-md border border-ink-100 bg-white"
                  >
                    <Image src={photo.url} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6 rounded-lg border border-ink-100 bg-white p-6">
          <p className="text-sm text-ink-500">Prix</p>
          <p className="text-3xl font-bold text-brand-600">{formatPrice(vehicle.price)}</p>
        </div>

        {vehicle.listingUrls.length > 0 && (
          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Voir l&apos;annonce complète</h2>
            <div className="flex flex-wrap gap-2">
              {vehicle.listingUrls.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
