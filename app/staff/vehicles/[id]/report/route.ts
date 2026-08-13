import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { daysSince } from "@/lib/format";
import {
  VehicleReport,
  type ReportMetricKey,
  type ReportRow,
  type VehicleReportData,
} from "@/lib/pdf/VehicleReport";

// react-pdf s'appuie sur des API Node (fs, streams) : runtime Node obligatoire.
export const runtime = "nodejs";

const METRIC_KEYS: ReportMetricKey[] = [
  "views",
  "detailViews",
  "contacts",
  "calls",
  "favorites",
  "visits",
  "offers",
];

// Formatage « à la main » avec une espace simple : react-pdf ne gère pas les
// espaces insécables étroites (U+202F) posées par Intl.NumberFormat("fr-FR").
function groupThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function euro(n: number): string {
  return `${groupThousands(n)} €`;
}
function frDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function sanitizeFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { agencyId, userId } = await requireStaff();
  const { id } = await params;

  // Isolation stricte : agence + agent assigné au client propriétaire.
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, agencyId, client: { assignedStaffId: userId } },
    include: {
      client: { include: { assignedStaff: { select: { firstName: true } } } },
      weeklyStats: { orderBy: { weekStart: "asc" } },
    },
  });

  if (!vehicle) {
    return new Response("Introuvable", { status: 404 });
  }

  const stats = vehicle.weeklyStats;

  const rows: ReportRow[] = stats.map((s, i) => {
    const prev = i > 0 ? stats[i - 1] : null;
    const values = {} as Record<ReportMetricKey, number>;
    const gains = {} as Record<ReportMetricKey, number | null>;
    for (const k of METRIC_KEYS) {
      values[k] = s[k];
      gains[k] = prev ? s[k] - prev[k] : null;
    }
    return { week: frDate(s.weekStart), values, gains };
  });

  // Total cumulé = dernier relevé (snapshot le plus récent).
  const last = stats[stats.length - 1];
  const totals = {} as Record<ReportMetricKey, number>;
  for (const k of METRIC_KEYS) totals[k] = last ? last[k] : 0;

  const statusLabels: Record<string, string> = {
    EN_VENTE: "En vente",
    VENDU: "Vendu",
    RETIRE: "Retiré",
  };

  const data: VehicleReportData = {
    title: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
    statusLabel: statusLabels[vehicle.status] ?? vehicle.status,
    ownerName: `${vehicle.client.firstName} ${vehicle.client.lastName}`,
    advisorName: vehicle.client.assignedStaff?.firstName ?? null,
    reference: vehicle.reference,
    mileageLabel: `${groupThousands(vehicle.mileage)} km`,
    fuelType: vehicle.fuelType,
    priceLabel: euro(vehicle.price),
    advisedPriceLabel: vehicle.advisedPrice != null ? euro(vehicle.advisedPrice) : null,
    depositDateLabel: frDate(vehicle.depositDate),
    daysOnline: daysSince(vehicle.depositDate),
    generatedAtLabel: frDate(new Date()),
    totals,
    rows,
  };

  // VehicleReport encapsule un <Document> ; on type l'élément en conséquence
  // pour renderToBuffer (qui attend un ReactElement<DocumentProps>).
  const element = React.createElement(VehicleReport, { data }) as React.ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  const filename = `rapport-${sanitizeFilename(`${vehicle.make}-${vehicle.model}-${vehicle.reference}`)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
