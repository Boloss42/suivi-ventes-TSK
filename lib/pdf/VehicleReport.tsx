import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

/**
 * Rapport PDF des relevés d'une annonce (généré côté serveur, runtime Node).
 *
 * ⚠️ Formatage : react-pdf ne gère pas les espaces insécables étroites (U+202F)
 * que `Intl.NumberFormat("fr-FR")` insère comme séparateur de milliers et avant
 * le « € ». On formate donc les nombres à la main avec une espace simple.
 *
 * ⚠️ Modèle cumulé : les relevés (WeeklyStat) sont des snapshots CUMULÉS. Chaque
 * cellule affiche donc le total cumulé ET le gain de la semaine (relevé −
 * précédent). Les données sont fournies déjà calculées par la route.
 */

export type ReportMetricKey = "views" | "contacts" | "calls" | "favorites" | "visits" | "offers";

export type ReportRow = {
  week: string; // date déjà formatée (jj/mm/aaaa)
  values: Record<ReportMetricKey, number>; // valeurs cumulées
  gains: Record<ReportMetricKey, number | null>; // gain hebdo (null pour le 1er relevé)
};

export type VehicleReportData = {
  title: string; // « Peugeot 308 (2019) »
  statusLabel: string;
  ownerName: string;
  advisorName?: string | null;
  reference: string;
  mileageLabel: string; // « 62 000 km »
  fuelType: string;
  priceLabel: string; // « 13 900 € »
  advisedPriceLabel?: string | null;
  depositDateLabel: string;
  daysOnline: number;
  generatedAtLabel: string;
  totals: Record<ReportMetricKey, number>;
  rows: ReportRow[]; // du plus ancien au plus récent
};

const ACCENT = "#ec028c";
const INK = "#12132a";
const MUTED = "#7a7b90";
const BORDER = "#e5e5ec";

const METRICS: { key: ReportMetricKey; label: string }[] = [
  { key: "views", label: "Vues" },
  { key: "contacts", label: "Contacts" },
  { key: "calls", label: "Appels" },
  { key: "favorites", label: "Favoris" },
  { key: "visits", label: "Visites" },
  { key: "offers", label: "Offres" },
];

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 44, paddingHorizontal: 40, fontSize: 9, color: INK, fontFamily: "Helvetica" },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: INK },
  brandAccent: { color: ACCENT },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  generated: { fontSize: 8, color: MUTED },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 14 },
  subtitle: { fontSize: 10, color: MUTED, marginTop: 2 },
  rule: { borderBottomWidth: 1, borderBottomColor: BORDER, marginTop: 12, marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 18 },
  infoItem: { width: "33.33%", marginBottom: 10, paddingRight: 8 },
  infoLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.4 },
  infoValue: { fontSize: 10, marginTop: 2 },
  totalsRow: { flexDirection: "row", marginBottom: 20 },
  totalCell: { width: "16.66%", borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: 8, marginRight: 4 },
  totalLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase" },
  totalValue: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 3 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  tHead: { flexDirection: "row", backgroundColor: "#fafafc", borderBottomWidth: 1, borderBottomColor: BORDER },
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  tRowLast: { flexDirection: "row" },
  th: { padding: 6, fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED },
  td: { padding: 6, fontSize: 9 },
  colWeek: { width: "16%" },
  colMetric: { width: "14%" },
  cellValue: { fontFamily: "Helvetica-Bold" },
  cellGain: { fontSize: 7, color: MUTED, marginTop: 1 },
  gainUp: { color: "#059669" },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED },
  note: { fontSize: 8, color: MUTED, marginTop: 8 },
});

// N.B. Police Helvetica (react-pdf par défaut) : pas de flèches ni de signe
// « moins » U+2212 ni d'espaces insécables étroites. On s'en tient à des
// caractères Latin-1 (le tiret cadratin « — » et « ± » passent bien).
function gainText(g: number | null): string {
  if (g == null) return "—";
  if (g === 0) return "±0";
  return g > 0 ? `+${g}` : `${g}`;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function VehicleReport({ data }: { data: VehicleReportData }) {
  return (
    <Document title={`Rapport ${data.title}`} author="MyVitrine">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>
            My<Text style={styles.brandAccent}>Vitrine</Text>
          </Text>
          <Text style={styles.generated}>Rapport généré le {data.generatedAtLabel}</Text>
        </View>

        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>
          {data.statusLabel} · {data.ownerName} · En ligne depuis {data.daysOnline} j
        </Text>

        <View style={styles.rule} />

        <Text style={styles.sectionTitle}>Caractéristiques</Text>
        <View style={styles.infoGrid}>
          <InfoItem label="Propriétaire" value={data.ownerName} />
          {data.advisorName ? <InfoItem label="Conseiller" value={data.advisorName} /> : null}
          <InfoItem label="Référence" value={data.reference} />
          <InfoItem label="Kilométrage" value={data.mileageLabel} />
          <InfoItem label="Motorisation" value={data.fuelType} />
          <InfoItem label="Prix net vendeur" value={data.priceLabel} />
          {data.advisedPriceLabel ? <InfoItem label="Prix de conseil" value={data.advisedPriceLabel} /> : null}
          <InfoItem label="Mise en dépôt" value={data.depositDateLabel} />
        </View>

        <Text style={styles.sectionTitle}>Synthèse depuis la mise en vente</Text>
        <View style={styles.totalsRow}>
          {METRICS.map((m, i) => (
            <View key={m.key} style={[styles.totalCell, i === METRICS.length - 1 ? { marginRight: 0 } : {}]}>
              <Text style={styles.totalLabel}>{m.label}</Text>
              <Text style={styles.totalValue}>{data.totals[m.key]}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Relevés hebdomadaires</Text>
        {data.rows.length === 0 ? (
          <Text style={styles.note}>Aucun relevé saisi pour cette annonce.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHead}>
              <Text style={[styles.th, styles.colWeek]}>Semaine</Text>
              {METRICS.map((m) => (
                <Text key={m.key} style={[styles.th, styles.colMetric]}>
                  {m.label}
                </Text>
              ))}
            </View>
            {data.rows.map((row, ri) => (
              <View key={row.week + ri} style={ri === data.rows.length - 1 ? styles.tRowLast : styles.tRow}>
                <Text style={[styles.td, styles.colWeek]}>{row.week}</Text>
                {METRICS.map((m) => {
                  const g = row.gains[m.key];
                  return (
                    <View key={m.key} style={[styles.td, styles.colMetric]}>
                      <Text style={styles.cellValue}>{row.values[m.key]}</Text>
                      <Text style={[styles.cellGain, g != null && g > 0 ? styles.gainUp : {}]}>{gainText(g)}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
        <Text style={styles.note}>
          Chaque cellule indique le total cumulé (chiffre) et le gain de la semaine (relevé moins relevé précédent).
        </Text>

        <View style={styles.footer} fixed>
          <Text>MyVitrine — Suivi des ventes</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
