// Moteur de diagnostic unifié : à partir des relevés hebdomadaires d'un
// véhicule ET de l'écart entre son prix net vendeur et le prix conseillé,
// produit un indice de vendabilité (0-100), un verdict en langage naturel et
// une incitation éventuelle à baisser le prix.
//
// Principe directeur : le prix est le levier n°1. L'indice combine la traction
// statistique (apparitions, vues, contacts, visites, offres) et deux
// coefficients :
//   - un coefficient de prix qui pénalise l'indice à mesure que le tarif
//     dépasse le prix conseillé ;
//   - un coefficient de TAUX DE CLIC (Vues ÷ Apparitions) : une annonce très
//     vue en liste mais peu cliquée n'accroche pas au premier regard
//     (photo/titre/prix affiché) — signal fort, souvent lié au prix.
// Tout signal négatif conclut sur un tarif/une annonce à revoir ; seules les
// offres et les visites donnent un verdict positif.

export type StatSnapshot = {
  views: number; // « Apparitions » : nb d'affichages dans les résultats
  detailViews: number; // « Vues » : nb d'ouvertures réelles de l'annonce
  contacts: number;
  calls: number;
  favorites: number;
  visits: number;
  offers: number;
};

export type DiagnosticTone = "good" | "neutral" | "warning" | "bad";

export type Diagnostic = {
  score: number; // 0-100 : chances de vente
  verdict: string;
  tone: DiagnosticTone;
  suggestPriceDrop: boolean;
};

export type AnalyzeOptions = {
  mandateDays?: number;
  price?: number;
  advisedPrice?: number | null;
  // Le taux de clic n'est exploité que si les Vues sont réellement suivies
  // pour ce véhicule (sinon les relevés historiques, à detailViews = 0,
  // seraient jugés à tort « peu cliqués »).
  vuesTracked?: boolean;
};

// Seuils regroupés pour ajustement facile.
const THRESHOLDS = {
  viewsHigh: 60,
  contactsLow: 1,
  viewsLow: 20,
  contactsSome: 2,
  oldMandateDays: 42, // ~6 semaines
};

const WEIGHTS = {
  offers: 45,
  visits: 18,
  calls: 7,
  contacts: 4,
  detailViews: 0.4, // « Vues » : signal d'intérêt réel, entre apparitions et contacts
  detailViewsCap: 90,
  viewsCap: 120,
  viewsFactor: 0.15, // « Apparitions » : simple visibilité, faible poids
};

// Coefficient de prix : 1 tant que le tarif est au niveau (ou en dessous) du
// prix conseillé, puis décroît de ~2 points par % de dépassement, plancher
// à 0,45. Ex. : +5 % → 0,90 · +10 % → 0,80 · +20 % → 0,60 · +27,5 % → 0,45.
const PRICE = { penaltyPerPct: 0.02, floor: 0.45 };

// Taux de clic (Vues ÷ Apparitions). En dessous de `minApparitions` sur la
// semaine, le ratio n'est pas fiable. `low` = seuil « n'accroche pas » ;
// `good` = seuil au-delà duquel aucune pénalité. Entre les deux, pénalité
// linéaire jusqu'au plancher `floor`.
const CTR = { minApparitions: 50, low: 0.015, good: 0.04, floor: 0.6 };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function baseScore(s: StatSnapshot) {
  const raw =
    s.offers * WEIGHTS.offers +
    s.visits * WEIGHTS.visits +
    s.calls * WEIGHTS.calls +
    s.contacts * WEIGHTS.contacts +
    Math.min(s.detailViews, WEIGHTS.detailViewsCap) * WEIGHTS.detailViews +
    Math.min(s.views, WEIGHTS.viewsCap) * WEIGHTS.viewsFactor;
  return Math.round(clamp(raw, 0, 100));
}

/** Pourcentage de dépassement du prix conseillé (0 si non renseigné ou en dessous). */
function priceOveragePct(price?: number, advisedPrice?: number | null) {
  if (!advisedPrice || !price || price <= advisedPrice) return 0;
  return ((price - advisedPrice) / advisedPrice) * 100;
}

/** Coefficient multiplicateur appliqué à l'indice statistique selon l'écart de prix. */
function priceFactor(overagePct: number) {
  if (overagePct <= 0) return 1;
  return clamp(1 - overagePct * PRICE.penaltyPerPct, PRICE.floor, 1);
}

/**
 * Taux de clic de la semaine (Vues ÷ Apparitions), ou null si les Vues ne sont
 * pas suivies ou s'il y a trop peu d'apparitions pour que le ratio soit fiable.
 */
function clickThroughRate(
  views: number,
  detailViews: number,
  vuesTracked?: boolean,
): number | null {
  if (!vuesTracked || views < CTR.minApparitions) return null;
  return detailViews / views;
}

/** Coefficient appliqué à l'indice selon le taux de clic (1 si non exploitable). */
function ctrFactor(ctr: number | null) {
  if (ctr === null) return 1;
  if (ctr >= CTR.good) return 1;
  if (ctr <= CTR.low) return CTR.floor;
  const t = (ctr - CTR.low) / (CTR.good - CTR.low);
  return CTR.floor + t * (1 - CTR.floor);
}

/**
 * @param latest    Dernier relevé hebdomadaire (ou null si aucun).
 * @param opts      Contexte optionnel : ancienneté du mandat, prix / prix de
 *                  conseil, et si les Vues sont suivies (pour le taux de clic).
 */
export function analyzeVehicle(
  latest: StatSnapshot | null,
  opts?: AnalyzeOptions,
): Diagnostic | null {
  if (!latest) return null;

  const { views, detailViews, contacts, visits, offers } = latest;

  // Corrélation prix ↔ stats et taux de clic : l'indice statistique brut est
  // pondéré par ces deux coefficients, de sorte qu'un même niveau de traction
  // donne un pourcentage de vente d'autant plus faible que le tarif dépasse le
  // conseil ou que l'annonce accroche peu (peu de clics par apparition).
  const overagePct = priceOveragePct(opts?.price, opts?.advisedPrice);
  const ctr = clickThroughRate(views, detailViews, opts?.vuesTracked);
  const base = Math.round(
    clamp(baseScore(latest) * priceFactor(overagePct) * ctrFactor(ctr), 0, 100),
  );

  // Écart au prix de conseil, pour enrichir les verdicts « prix trop élevé ».
  let priceGapText = "";
  const roundedOverage = Math.round(overagePct);
  if (roundedOverage >= 3) {
    priceGapText = ` (~${roundedOverage} % au-dessus du prix de conseil)`;
  }

  // 1. Offres : vente quasi acquise.
  if (offers >= 1) {
    return {
      score: Math.max(base, 78),
      verdict: "Votre véhicule reçoit des offres : la vente est très probable.",
      tone: "good",
      suggestPriceDrop: false,
    };
  }

  // 2. Visites : forte intention d'achat.
  if (visits >= 1) {
    return {
      score: clamp(base, 55, 74),
      verdict: "Des acheteurs se déplacent pour le voir : la vente approche.",
      tone: "good",
      suggestPriceDrop: false,
    };
  }

  // 3. Beaucoup d'apparitions mais peu de clics (faible taux de clic) →
  //    l'annonce n'accroche pas au premier regard (photo / titre / prix affiché).
  if (ctr !== null && ctr < CTR.low) {
    return {
      score: Math.min(base, 28),
      verdict: `Votre annonce apparaît beaucoup mais est peu cliquée (~${Math.round(ctr * 100)} % d'ouvertures) : au premier coup d'œil — photo, titre ou prix affiché — elle n'accroche pas. Le prix est le plus souvent en cause${priceGapText}.`,
      tone: "bad",
      suggestPriceDrop: true,
    };
  }

  // 4. Beaucoup vue mais peu de contacts → une fois l'annonce ouverte, le prix
  //    (ou le contenu) déçoit et coupe l'intérêt.
  if (views >= THRESHOLDS.viewsHigh && contacts <= THRESHOLDS.contactsLow) {
    return {
      score: Math.min(base, 30),
      verdict: `Votre annonce est beaucoup vue mais génère peu de contacts : le prix est probablement trop élevé${priceGapText}.`,
      tone: "bad",
      suggestPriceDrop: true,
    };
  }

  // 5. Peu de visibilité → le tarif fait sortir des recherches des acheteurs.
  if (views < THRESHOLDS.viewsLow) {
    return {
      score: Math.min(base, 30),
      verdict: `Votre annonce est peu vue : à ce prix, elle sort des recherches des acheteurs. Le tarif est probablement trop élevé${priceGapText}.`,
      tone: "bad",
      suggestPriceDrop: true,
    };
  }

  // 6. Des contacts mais aucune visite → le prix stoppe l'intérêt avant la visite.
  if (contacts >= THRESHOLDS.contactsSome && visits === 0) {
    return {
      score: Math.min(base, 35),
      verdict: `On vous contacte mais personne ne se déplace : à ce tarif, l'intérêt s'arrête avant la visite. Le prix est probablement trop élevé${priceGapText}.`,
      tone: "bad",
      suggestPriceDrop: true,
    };
  }

  // 7. Rien de décisif : phrase d'attente, sauf mandat déjà ancien sans traction.
  if ((opts?.mandateDays ?? 0) > THRESHOLDS.oldMandateDays) {
    return {
      score: Math.min(base, 40),
      verdict: `Votre véhicule est en ligne depuis un moment sans offre ni visite : le tarif est à reconsidérer${priceGapText}.`,
      tone: "warning",
      suggestPriceDrop: true,
    };
  }

  return {
    score: base,
    verdict: "Votre annonce démarre : les premiers indicateurs arrivent, laissons le temps aux contacts de venir.",
    tone: "neutral",
    suggestPriceDrop: false,
  };
}

/**
 * Gain d'activité de la dernière semaine = dernier relevé − relevé précédent.
 * Les relevés étant des totaux cumulés (snapshots), c'est cette différence —
 * pas le cumul — qui reflète l'activité de la semaine. Renvoie null s'il
 * manque un des deux relevés (moins de deux relevés). Les écarts négatifs
 * (saisie incohérente) sont ramenés à 0.
 */
export function weeklyActivity(
  latest: StatSnapshot | null,
  previous: StatSnapshot | null,
): StatSnapshot | null {
  if (!latest || !previous) return null;
  return {
    views: Math.max(0, latest.views - previous.views),
    detailViews: Math.max(0, latest.detailViews - previous.detailViews),
    contacts: Math.max(0, latest.contacts - previous.contacts),
    calls: Math.max(0, latest.calls - previous.calls),
    favorites: Math.max(0, latest.favorites - previous.favorites),
    visits: Math.max(0, latest.visits - previous.visits),
    offers: Math.max(0, latest.offers - previous.offers),
  };
}

/**
 * Diagnostic à partir des deux derniers relevés cumulés : analyse le gain de la
 * semaine (et non le cumul). Renvoie null tant qu'il n'y a pas deux relevés
 * (activité hebdomadaire non mesurable) — la carte « Chances de vente » n'est
 * alors pas affichée.
 */
export function diagnoseFromSnapshots(
  latest: StatSnapshot | null,
  previous: StatSnapshot | null,
  opts?: Omit<AnalyzeOptions, "vuesTracked">,
): Diagnostic | null {
  const weekly = weeklyActivity(latest, previous);
  if (!weekly) return null;
  // Les Vues sont « suivies » dès que le dernier relevé cumulé en comporte :
  // sinon (véhicules historiques à 0), on n'exploite pas le taux de clic.
  const vuesTracked = (latest?.detailViews ?? 0) > 0;
  return analyzeVehicle(weekly, { ...opts, vuesTracked });
}
