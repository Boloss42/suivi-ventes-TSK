import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import SellabilityCard from "@/components/SellabilityCard";
import { formatDate, formatPrice, formatMileage, formatMandateAge, daysSince } from "@/lib/format";
import { currentWeekStart, formatWeekLabel, formatWeekShort } from "@/lib/week";
import { diagnoseFromSnapshots } from "@/lib/diagnostic";
import { respondToPriceProposal } from "@/lib/actions/priceProposals";
import DeleteStatButton from "@/components/DeleteStatButton";
import SaleSummary, { type SummaryMetric } from "@/components/SaleSummary";
import StatDetailChart, { type StatPoint } from "@/components/client/StatDetailChart";
import PriceSuggestionPanel from "@/components/staff/PriceSuggestionPanel";
import OffersPanel, { type OfferItem } from "@/components/staff/OffersPanel";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { agencyId, userId } = await requireStaff();
  const { id } = await params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, agencyId, client: { assignedStaffId: userId } },
    include: {
      client: true,
      photos: { orderBy: { order: "asc" } },
      listingUrls: true,
      weeklyStats: { orderBy: { weekStart: "desc" } },
      priceChanges: { orderBy: { createdAt: "desc" } },
      priceSuggestions: { orderBy: { createdAt: "desc" } },
      offers: { orderBy: { createdAt: "desc" } },
      _count: { select: { shareClicks: true } },
    },
  });

  if (!vehicle) notFound();

  const priceProposals = await prisma.priceProposal.findMany({
    where: { vehicleId: id },
    orderBy: { createdAt: "desc" },
  });

  const latestStat = vehicle.weeklyStats[0];
  const prevStat = vehicle.weeklyStats[1];
  // Relevés cumulés : le diagnostic analyse le gain de la semaine (dernier −
  // précédent), pas le cumul. Pas de carte tant qu'il n'y a pas deux relevés.
  const diagnostic = diagnoseFromSnapshots(
    latestStat
      ? {
          views: latestStat.views,
          contacts: latestStat.contacts,
          calls: latestStat.calls,
          favorites: latestStat.favorites,
          visits: latestStat.visits,
          offers: latestStat.offers,
        }
      : null,
    prevStat
      ? {
          views: prevStat.views,
          contacts: prevStat.contacts,
          calls: prevStat.calls,
          favorites: prevStat.favorites,
          visits: prevStat.visits,
          offers: prevStat.offers,
        }
      : null,
    { mandateDays: daysSince(vehicle.depositDate), price: vehicle.price, advisedPrice: vehicle.advisedPrice },
  );

  const thisWeek = currentWeekStart();
  const hasThisWeekStat = vehicle.weeklyStats.some(
    (s) => s.weekStart.getTime() === thisWeek.getTime(),
  );

  // Synthèse : les relevés sont des totaux cumulés (snapshots). Le total =
  // dernier relevé ; l'évolution de la semaine = dernier relevé − précédent.
  // Relevés triés du plus récent au plus ancien côté staff : dernier = [0],
  // précédent = [1].
  const lastWeek = vehicle.weeklyStats[0];
  const prevWeek = vehicle.weeklyStats[1];
  const summaryMetrics: SummaryMetric[] = [
    { label: "Vues", total: lastWeek?.views ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.views - prevWeek.views : null },
    { label: "Contacts", total: lastWeek?.contacts ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.contacts - prevWeek.contacts : null },
    { label: "Appels", total: lastWeek?.calls ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.calls - prevWeek.calls : null },
    { label: "Favoris", total: lastWeek?.favorites ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.favorites - prevWeek.favorites : null },
    { label: "Visites", total: lastWeek?.visits ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.visits - prevWeek.visits : null, highlight: true },
    { label: "Offres", total: lastWeek?.offers ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.offers - prevWeek.offers : null, highlight: true },
  ];
  const daysOnline = daysSince(vehicle.depositDate);

  // Données du graphe : en ordre chronologique (les relevés sont triés du plus
  // récent au plus ancien côté staff).
  const chartData: StatPoint[] = [...vehicle.weeklyStats].reverse().map((s) => ({
    week: formatWeekShort(s.weekStart),
    views: s.views,
    contacts: s.contacts,
    calls: s.calls,
    favorites: s.favorites,
    visits: s.visits,
    offers: s.offers,
  }));

  const offerItems: OfferItem[] = vehicle.offers.map((o) => ({
    id: o.id,
    amount: o.amount,
    buyerName: o.buyerName,
    buyerContact: o.buyerContact,
    note: o.note,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-ink-900">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </h1>
            <StatusBadge status={vehicle.status} />
            {/* Repli : le bandeau de synthèse porte déjà « En ligne depuis » dès
                qu'il y a un relevé. On n'affiche ce badge que sans relevé, pour
                garder une seule mention. */}
            {vehicle.status === "EN_VENTE" && vehicle.weeklyStats.length === 0 && (
              <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600">
                En ligne depuis {formatMandateAge(vehicle.depositDate)}
              </span>
            )}
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

      {vehicle.weeklyStats.length > 0 && (
        <div className="mb-6">
          <SaleSummary daysOnline={daysOnline} metrics={summaryMetrics} />
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
              {vehicle.advisedPrice != null && (
                <Row label="Prix de conseil" value={formatPrice(vehicle.advisedPrice)} />
              )}
              <Row label="Mise en dépôt" value={formatDate(vehicle.depositDate)} />
            </dl>
          </div>

          {vehicle.priceChanges.length > 1 && (
            <div className="rounded-lg border border-ink-100 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold text-ink-800">Historique du prix</h2>
              <ul className="space-y-2 text-sm">
                {vehicle.priceChanges.map((change) => (
                  <li key={change.id} className="flex items-center justify-between gap-2">
                    <span className="text-ink-500">{formatDate(change.createdAt)}</span>
                    <span className="font-medium text-ink-900">{formatPrice(change.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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

          {vehicle.priceSuggestions.length > 0 && (
            <div className="rounded-lg border border-ink-100 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold text-ink-800">
                Baisses de prix recommandées ({vehicle.priceSuggestions.length})
              </h2>
              <p className="mb-3 text-xs text-ink-500">
                Recommandations de baisse envoyées au client, de la plus récente à la
                plus ancienne.
              </p>
              <ul className="space-y-2">
                {vehicle.priceSuggestions.map((s) => (
                  <li key={s.id} className="rounded-md border border-ink-100 bg-ink-50 px-3 py-2 text-sm">
                    <p className="font-medium text-ink-900">
                      {formatPrice(s.amount)}
                      <span className="ml-2 text-xs font-normal text-ink-500">
                        {formatDate(s.createdAt)}
                      </span>
                    </p>
                    {s.message && <p className="mt-1 text-ink-600">« {s.message} »</p>}
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

        <div className="min-w-0 space-y-6">
          {diagnostic && (
            <SellabilityCard
              diagnostic={diagnostic}
              cta={
                <PriceSuggestionPanel
                  vehicleId={vehicle.id}
                  currentPrice={vehicle.price}
                  advisedPrice={vehicle.advisedPrice}
                />
              }
            />
          )}

          {vehicle._count.shareClicks > 0 && (
            <p className="text-sm text-ink-500">
              Lien de partage du client :{" "}
              <span className="font-medium text-ink-800">
                {vehicle._count.shareClicks} clic{vehicle._count.shareClicks > 1 ? "s" : ""}
              </span>
            </p>
          )}

          <OffersPanel vehicleId={vehicle.id} offers={offerItems} />

          {chartData.length > 0 && (
            <StatDetailChart
              data={chartData}
              latestValues={{
                views: latestStat?.views,
                contacts: latestStat?.contacts,
                calls: latestStat?.calls,
                favorites: latestStat?.favorites,
                visits: latestStat?.visits,
                offers: latestStat?.offers,
              }}
              latestWeekLabel={latestStat ? formatDate(latestStat.weekStart) : null}
            />
          )}

          <div className="rounded-lg border border-ink-100 bg-white p-6">
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
                    <th className="py-2 pr-4 font-medium">Apparitions</th>
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
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/staff/vehicles/${vehicle.id}/stats/${stat.id}/edit`}
                            className="text-brand-700 hover:underline"
                          >
                            Modifier
                          </Link>
                          <DeleteStatButton statId={stat.id} />
                        </div>
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
