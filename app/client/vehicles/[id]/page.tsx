import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatPrice, formatMileage } from "@/lib/format";
import { formatWeekShort } from "@/lib/week";
import StatsChart, { type ChartPoint } from "@/components/client/StatsChart";

export default async function ClientVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { clientId } = await requireClient();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { order: "asc" } },
      listingUrls: true,
      weeklyStats: { orderBy: { weekStart: "asc" } },
    },
  });

  // Isolation stricte : un véhicule qui n'appartient pas au client connecté
  // n'existe tout simplement pas de son point de vue.
  if (!vehicle || vehicle.clientId !== clientId) notFound();

  const chartData: ChartPoint[] = vehicle.weeklyStats.map((s) => ({
    week: formatWeekShort(s.weekStart),
    Vues: s.views,
    Contacts: s.contacts,
    Appels: s.calls,
    Favoris: s.favorites,
    Visites: s.visits,
    Offres: s.offers,
  }));

  const latestStat = vehicle.weeklyStats.at(-1);
  const historyDesc = [...vehicle.weeklyStats].reverse();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-ink-900">
          {vehicle.make} {vehicle.model} ({vehicle.year})
        </h1>
        <StatusBadge status={vehicle.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="min-w-0 space-y-4">
          {vehicle.photos.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
              <div className="relative aspect-video">
                <Image src={vehicle.photos[0].url} alt="" fill className="object-cover" />
              </div>
              {vehicle.photos.length > 1 && (
                <div className="grid grid-cols-4 gap-1 p-1">
                  {vehicle.photos.slice(1).map((photo) => (
                    <div key={photo.id} className="relative aspect-square overflow-hidden rounded">
                      <Image src={photo.url} alt="" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Caractéristiques</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Kilométrage" value={formatMileage(vehicle.mileage)} />
              <Row label="Motorisation" value={vehicle.fuelType} />
              <Row label="Prix affiché" value={formatPrice(vehicle.price)} />
              <Row label="En dépôt depuis" value={formatDate(vehicle.depositDate)} />
            </dl>
          </div>

          {vehicle.listingUrls.length > 0 && (
            <div className="rounded-lg border border-ink-100 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold text-ink-800">Voir l&apos;annonce</h2>
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
        </div>

        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <StatTile label="Vues" value={latestStat?.views} />
            <StatTile label="Contacts" value={latestStat?.contacts} />
            <StatTile label="Appels" value={latestStat?.calls} />
            <StatTile label="Favoris" value={latestStat?.favorites} />
            <StatTile label="Visites" value={latestStat?.visits} />
            <StatTile label="Offres" value={latestStat?.offers} />
          </div>

          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold text-ink-800">Évolution des statistiques</h2>
            <p className="mb-4 text-sm text-ink-500">
              {latestStat
                ? `Dernier relevé : ${formatDate(latestStat.weekStart)}`
                : "Aucun relevé saisi pour le moment."}
            </p>
            {chartData.length > 0 ? (
              <StatsChart data={chartData} />
            ) : (
              <p className="py-12 text-center text-sm text-ink-400">
                Les statistiques apparaîtront ici dès le premier relevé hebdomadaire.
              </p>
            )}
          </div>

          {historyDesc.length > 0 && (
            <div className="rounded-lg border border-ink-100 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-ink-800">Historique détaillé</h2>
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
                      <th className="py-2 pr-4 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyDesc.map((stat) => (
                      <tr key={stat.id} className="border-b border-ink-50 last:border-0">
                        <td className="py-2 pr-4 text-ink-800">{formatDate(stat.weekStart)}</td>
                        <td className="py-2 pr-4 text-ink-600">{stat.views}</td>
                        <td className="py-2 pr-4 text-ink-600">{stat.contacts}</td>
                        <td className="py-2 pr-4 text-ink-600">{stat.calls}</td>
                        <td className="py-2 pr-4 text-ink-600">{stat.favorites}</td>
                        <td className="py-2 pr-4 text-ink-600">{stat.visits}</td>
                        <td className="py-2 pr-4 text-ink-600">{stat.offers}</td>
                        <td className="py-2 pr-4 text-ink-500">{stat.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

function StatTile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-3 text-center">
      <p className="text-lg font-semibold text-ink-900">{value ?? "—"}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}
