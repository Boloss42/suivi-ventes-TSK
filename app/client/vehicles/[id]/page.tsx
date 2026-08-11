import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import SellabilityCard from "@/components/SellabilityCard";
import { formatDate, formatPrice, formatMileage, formatMandateAge, daysSince } from "@/lib/format";
import { formatWeekShort } from "@/lib/week";
import { analyzeVehicle } from "@/lib/diagnostic";
import StatDetailChart, { type StatPoint } from "@/components/client/StatDetailChart";
import HistoryTable from "@/components/client/HistoryTable";
import PriceProposalPanel from "@/components/client/PriceProposalPanel";
import SharePanel from "@/components/client/SharePanel";
import AccelerateSaleModal from "@/components/client/AccelerateSaleModal";
import SaleSummary, { type SummaryMetric } from "@/components/SaleSummary";
import SaleEstimate from "@/components/client/SaleEstimate";
import ActivityTimeline, { type TimelineEvent, type TimelineTone } from "@/components/client/ActivityTimeline";
import { estimateSaleTime } from "@/lib/saleEstimate";

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
      priceChanges: { orderBy: { createdAt: "desc" } },
      _count: { select: { shareClicks: true } },
    },
  });

  // Isolation stricte : un véhicule qui n'appartient pas au client connecté
  // n'existe tout simplement pas de son point de vue.
  if (!vehicle || vehicle.clientId !== clientId) notFound();

  const proposals = await prisma.priceProposal.findMany({
    where: { vehicleId: id },
    orderBy: { createdAt: "desc" },
  });
  const latestProposalRow = proposals[0] ?? null;

  const chartData: StatPoint[] = vehicle.weeklyStats.map((s) => ({
    week: formatWeekShort(s.weekStart),
    views: s.views,
    contacts: s.contacts,
    calls: s.calls,
    favorites: s.favorites,
    visits: s.visits,
    offers: s.offers,
  }));

  const latestStat = vehicle.weeklyStats.at(-1);
  const historyDesc = [...vehicle.weeklyStats].reverse();

  const diagnostic = analyzeVehicle(
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
    {
      mandateDays: daysSince(vehicle.depositDate),
      price: vehicle.price,
      advisedPrice: vehicle.advisedPrice,
    },
  );

  // --- Synthèse cumulée + évolution de la dernière semaine ---
  const totals = vehicle.weeklyStats.reduce(
    (a, s) => ({
      views: a.views + s.views,
      contacts: a.contacts + s.contacts,
      calls: a.calls + s.calls,
      favorites: a.favorites + s.favorites,
      visits: a.visits + s.visits,
      offers: a.offers + s.offers,
    }),
    { views: 0, contacts: 0, calls: 0, favorites: 0, visits: 0, offers: 0 },
  );
  const lastWeek = vehicle.weeklyStats.at(-1);
  const prevWeek = vehicle.weeklyStats.at(-2);
  const summaryMetrics: SummaryMetric[] = [
    { label: "Vues", total: totals.views, week: lastWeek?.views ?? null, prevWeek: prevWeek?.views ?? null },
    { label: "Contacts", total: totals.contacts, week: lastWeek?.contacts ?? null, prevWeek: prevWeek?.contacts ?? null },
    { label: "Appels", total: totals.calls, week: lastWeek?.calls ?? null, prevWeek: prevWeek?.calls ?? null },
    { label: "Favoris", total: totals.favorites, week: lastWeek?.favorites ?? null, prevWeek: prevWeek?.favorites ?? null },
    { label: "Visites", total: totals.visits, week: lastWeek?.visits ?? null, prevWeek: prevWeek?.visits ?? null, highlight: true },
    { label: "Offres", total: totals.offers, week: lastWeek?.offers ?? null, prevWeek: prevWeek?.offers ?? null, highlight: true },
  ];
  const daysOnline = daysSince(vehicle.depositDate);

  // --- Estimation indicative du délai de vente ---
  const estimate = estimateSaleTime(diagnostic, latestStat ?? null);

  // --- Fil chronologique de la vente ---
  const initialPrice = vehicle.priceChanges.at(-1)?.price ?? vehicle.price;
  const rawEvents: { at: Date; title: string; detail?: string; tone: TimelineTone }[] = [
    {
      at: vehicle.depositDate,
      title: "Mise en dépôt",
      detail: `Prix de départ : ${formatPrice(initialPrice)}`,
      tone: "brand",
    },
  ];
  // Changements de prix (hors ligne initiale, déjà couverte par la mise en dépôt).
  for (const change of vehicle.priceChanges.slice(0, -1)) {
    rawEvents.push({
      at: change.createdAt,
      title: "Prix ajusté",
      detail: formatPrice(change.price),
      tone: "neutral",
    });
  }
  for (const proposal of proposals) {
    const statusLabel =
      proposal.status === "PENDING"
        ? "en attente"
        : proposal.status === "ACCEPTED"
          ? "acceptée"
          : "refusée";
    rawEvents.push({
      at: proposal.createdAt,
      title: "Proposition de baisse",
      detail: `${formatPrice(proposal.proposedPrice)} — ${statusLabel}`,
      tone: proposal.status === "PENDING" ? "warning" : "neutral",
    });
  }
  const bestWeek = [...vehicle.weeklyStats].sort((a, b) => b.views - a.views)[0];
  if (bestWeek && bestWeek.views > 0) {
    rawEvents.push({
      at: bestWeek.weekStart,
      title: "Pic d'activité",
      detail: `${bestWeek.views} vues en une semaine`,
      tone: "good",
    });
  }
  const timelineEvents: TimelineEvent[] = rawEvents
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .map((e) => ({ date: formatDate(e.at), title: e.title, detail: e.detail, tone: e.tone }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-ink-900">
          {vehicle.make} {vehicle.model} ({vehicle.year})
        </h1>
        <StatusBadge status={vehicle.status} />
        {vehicle.status === "EN_VENTE" && (
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600">
            En ligne depuis {formatMandateAge(vehicle.depositDate)}
          </span>
        )}
      </div>

      {vehicle.weeklyStats.length > 0 && (
        <div className="mb-6">
          <SaleSummary daysOnline={daysOnline} metrics={summaryMetrics} />
        </div>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[380px_1fr]">
        <div className="contents lg:block lg:min-w-0 lg:space-y-4">
          {vehicle.photos.length > 0 && (
            <div className="order-1 overflow-hidden rounded-lg border border-ink-100 bg-white lg:order-none">
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

          <div className="order-2 rounded-lg border border-ink-100 bg-white p-6 lg:order-none">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Caractéristiques</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Kilométrage" value={formatMileage(vehicle.mileage)} />
              <Row label="Motorisation" value={vehicle.fuelType} />
              <Row label="Prix net vendeur" value={formatPrice(vehicle.price)} />
              <Row label="En dépôt depuis" value={formatDate(vehicle.depositDate)} />
            </dl>
          </div>

          {vehicle.priceChanges.length > 1 && (
            <div className="order-6 rounded-lg border border-ink-100 bg-white p-6 lg:order-none">
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

          {vehicle.advisedPrice != null && (
            <div className="order-7 rounded-lg border border-ink-100 bg-white p-4 lg:order-none">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Prix de conseil
              </p>
              <p className="mt-1 text-sm text-ink-800">
                <span className="font-semibold">{formatPrice(vehicle.advisedPrice)}</span>
                {vehicle.price > vehicle.advisedPrice && (
                  <span className="text-ink-500">
                    {" — votre prix actuel est "}
                    {Math.round(
                      ((vehicle.price - vehicle.advisedPrice) / vehicle.advisedPrice) * 100,
                    )}
                    {" % au-dessus"}
                  </span>
                )}
              </p>
            </div>
          )}

          <div id="proposer-prix" className="order-8 lg:order-none">
            <PriceProposalPanel
              vehicleId={vehicle.id}
              currentPrice={vehicle.price}
              advisedPrice={vehicle.advisedPrice}
              latestProposal={
                latestProposalRow
                  ? {
                      proposedPrice: latestProposalRow.proposedPrice,
                      message: latestProposalRow.message,
                      status: latestProposalRow.status,
                      createdAt: latestProposalRow.createdAt.toISOString(),
                    }
                  : null
              }
            />
          </div>

          <div id="partager-annonce" className="order-9 lg:order-none">
            <SharePanel vehicleId={vehicle.id} clickCount={vehicle._count.shareClicks} />
          </div>

          {vehicle.listingUrls.length > 0 && (
            <div className="order-10 rounded-lg border border-ink-100 bg-white p-6 lg:order-none">
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

        <div className="contents lg:block lg:min-w-0 lg:space-y-6">
          {diagnostic && (
            <div className="order-5 lg:order-none">
              <SellabilityCard
                diagnostic={diagnostic}
                cta={
                  diagnostic.suggestPriceDrop ? (
                    <a
                      href="#proposer-prix"
                      className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                    >
                      Proposer une baisse de prix →
                    </a>
                  ) : (
                    <AccelerateSaleModal
                      advisedPrice={vehicle.advisedPrice}
                      currentPrice={vehicle.price}
                    />
                  )
                }
              />
            </div>
          )}

          {estimate && (
            <div className="order-5 lg:order-none">
              <SaleEstimate estimate={estimate} />
            </div>
          )}

          <div className="order-3 lg:order-none">
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
          </div>

          {historyDesc.length > 0 && (
            <div className="order-4 lg:order-none">
              <HistoryTable
                stats={historyDesc.map((stat) => ({
                  id: stat.id,
                  weekStart: stat.weekStart.toISOString(),
                  views: stat.views,
                  contacts: stat.contacts,
                  calls: stat.calls,
                  favorites: stat.favorites,
                  visits: stat.visits,
                  offers: stat.offers,
                  note: stat.note,
                }))}
              />
            </div>
          )}

          {timelineEvents.length > 0 && (
            <div className="order-11 lg:order-none">
              <ActivityTimeline events={timelineEvents} />
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
