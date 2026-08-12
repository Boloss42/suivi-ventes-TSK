import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import SellabilityCard from "@/components/SellabilityCard";
import { formatDate, formatPrice, formatMileage, formatMandateAge, daysSince } from "@/lib/format";
import { formatWeekShort } from "@/lib/week";
import { diagnoseFromSnapshots, weeklyActivity } from "@/lib/diagnostic";
import StatDetailChart, { type StatPoint } from "@/components/client/StatDetailChart";
import PriceProposalPanel from "@/components/client/PriceProposalPanel";
import SharePanel from "@/components/client/SharePanel";
import AccelerateSaleModal from "@/components/client/AccelerateSaleModal";
import SaleSummary, { type SummaryMetric } from "@/components/SaleSummary";
import SaleEstimate from "@/components/client/SaleEstimate";
import ActivityTimeline, { type TimelineEvent, type TimelineTone } from "@/components/client/ActivityTimeline";
import OffersList, { type ClientOffer } from "@/components/client/OffersList";
import CollapsibleCard from "@/components/client/CollapsibleCard";
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
      priceSuggestions: { orderBy: { createdAt: "desc" } },
      offers: { orderBy: { createdAt: "desc" } },
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
  const prevStat = vehicle.weeklyStats.at(-2);
  const latestSnap = latestStat
    ? {
        views: latestStat.views,
        contacts: latestStat.contacts,
        calls: latestStat.calls,
        favorites: latestStat.favorites,
        visits: latestStat.visits,
        offers: latestStat.offers,
      }
    : null;
  const prevSnap = prevStat
    ? {
        views: prevStat.views,
        contacts: prevStat.contacts,
        calls: prevStat.calls,
        favorites: prevStat.favorites,
        visits: prevStat.visits,
        offers: prevStat.offers,
      }
    : null;
  // Relevés cumulés : diagnostic ET estimation portent sur le gain de la
  // semaine (dernier − précédent), pas le cumul.
  const weekly = weeklyActivity(latestSnap, prevSnap);
  const diagnostic = diagnoseFromSnapshots(latestSnap, prevSnap, {
    mandateDays: daysSince(vehicle.depositDate),
    price: vehicle.price,
    advisedPrice: vehicle.advisedPrice,
  });

  // --- Synthèse : les relevés sont des totaux cumulés (snapshots). Le total =
  // dernier relevé ; l'évolution de la semaine = dernier relevé − précédent. ---
  const lastWeek = vehicle.weeklyStats.at(-1); // le plus récent (relevés triés asc)
  const prevWeek = vehicle.weeklyStats.at(-2);
  const summaryMetrics: SummaryMetric[] = [
    { label: "Vues", total: lastWeek?.views ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.views - prevWeek.views : null },
    { label: "Contacts", total: lastWeek?.contacts ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.contacts - prevWeek.contacts : null },
    { label: "Appels", total: lastWeek?.calls ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.calls - prevWeek.calls : null },
    { label: "Favoris", total: lastWeek?.favorites ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.favorites - prevWeek.favorites : null },
    { label: "Visites", total: lastWeek?.visits ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.visits - prevWeek.visits : null, highlight: true },
    { label: "Offres", total: lastWeek?.offers ?? 0, weekDelta: lastWeek && prevWeek ? lastWeek.offers - prevWeek.offers : null, highlight: true },
  ];
  const daysOnline = daysSince(vehicle.depositDate);

  // --- Estimation indicative du délai de vente ---
  const estimate = estimateSaleTime(diagnostic, weekly);

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
  // Baisses de prix recommandées par le conseiller (staff → client).
  for (const suggestion of vehicle.priceSuggestions) {
    rawEvents.push({
      at: suggestion.createdAt,
      title: "Baisse recommandée par votre conseiller",
      detail: formatPrice(suggestion.amount),
      tone: "brand",
    });
  }
  // Offres d'achat reçues (datées dans l'historique).
  for (const offer of vehicle.offers) {
    const statusLabel =
      offer.status === "ACCEPTED"
        ? "acceptée"
        : offer.status === "REJECTED"
          ? "déclinée"
          : offer.status === "COUNTERED"
            ? "en négociation"
            : "nouvelle";
    rawEvents.push({
      at: offer.createdAt,
      title: "Offre reçue",
      detail: `${formatPrice(offer.amount)} — ${statusLabel}`,
      tone: offer.status === "ACCEPTED" ? "good" : "neutral",
    });
  }
  // Pic d'activité : plus fort GAIN de vues sur une semaine (relevé − relevé
  // précédent), pas le cumul. Les relevés sont triés du plus ancien au plus
  // récent, donc l'écart i / i-1 est bien l'activité de la semaine i.
  let bestWeek: { weekStart: Date; delta: number } | null = null;
  for (let i = 1; i < vehicle.weeklyStats.length; i++) {
    const delta = vehicle.weeklyStats[i].views - vehicle.weeklyStats[i - 1].views;
    if (delta > 0 && (!bestWeek || delta > bestWeek.delta)) {
      bestWeek = { weekStart: vehicle.weeklyStats[i].weekStart, delta };
    }
  }
  if (bestWeek) {
    rawEvents.push({
      at: bestWeek.weekStart,
      title: "Pic d'activité",
      detail: `${bestWeek.delta} vues en une semaine`,
      tone: "good",
    });
  }
  const timelineEvents: TimelineEvent[] = rawEvents
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .map((e) => ({ date: formatDate(e.at), title: e.title, detail: e.detail, tone: e.tone }));

  // Offres reçues (vue client : montant, statut, nom acheteur — sans contact).
  const clientOffers: ClientOffer[] = vehicle.offers.map((o) => ({
    id: o.id,
    amount: o.amount,
    buyerName: o.buyerName,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div>
      {/* Mobile : la photo passe tout en haut de la page (au-dessus du titre et
          du bandeau). Sur desktop, elle reste dans la colonne de gauche (bloc
          ci-dessous, masqué en mobile). */}
      {vehicle.photos.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-lg border border-ink-100 bg-white lg:hidden">
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

      <div className="mb-6 flex flex-wrap items-center gap-3">
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

      {vehicle.weeklyStats.length > 0 && (
        <div className="mb-6">
          <SaleSummary daysOnline={daysOnline} metrics={summaryMetrics} />
        </div>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[380px_1fr]">
        <div className="contents lg:block lg:min-w-0 lg:space-y-4">
          {/* Version desktop de la photo (dans la colonne). Masquée en mobile,
              où la photo est déjà affichée tout en haut de la page. */}
          {vehicle.photos.length > 0 && (
            <div className="hidden overflow-hidden rounded-lg border border-ink-100 bg-white lg:order-none lg:block">
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

          {/* Caractéristiques : repliées par défaut sur mobile (page plus légère
              à lire), toujours ouvertes sur desktop. */}
          <div className="order-2 lg:order-none">
            <CollapsibleCard title="Caractéristiques">
              <dl className="space-y-2 text-sm">
                <Row label="Kilométrage" value={formatMileage(vehicle.mileage)} />
                <Row label="Motorisation" value={vehicle.fuelType} />
                <Row label="Prix net vendeur" value={formatPrice(vehicle.price)} />
                <Row label="En dépôt depuis" value={formatDate(vehicle.depositDate)} />
              </dl>
            </CollapsibleCard>
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

          {clientOffers.length > 0 && (
            <div className="order-5 lg:order-none">
              <OffersList offers={clientOffers} />
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
