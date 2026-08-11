// Moteur de diagnostic unifié : à partir des relevés hebdomadaires d'un
// véhicule ET de l'écart entre son prix net vendeur et le prix conseillé,
// produit un indice de vendabilité (0-100), un verdict en langage naturel et
// une incitation éventuelle à baisser le prix.
//
// Principe directeur : le prix est le levier n°1. L'indice combine deux
// facteurs : la traction statistique (vues, contacts, visites, offres) et un
// coefficient de prix qui pénalise l'indice à mesure que le tarif dépasse le
// prix conseillé. Tout signal négatif (peu de visibilité, beaucoup de vues sans
// contact, contacts sans visite, ancienneté sans traction) conclut sur un tarif
// trop élevé ; seules les offres et les visites donnent un verdict positif.

export type StatSnapshot = {
  views: number;
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

// Seuils regroupés pour ajustement facile.
const THRESHOLDS = {
  viewsHigh: 60,
  contactsLow: 1,
  viewsLow: 20,
  contactsSome: 2,
  oldMandateDays: 42, // ~6 semaines
};

const WEIGHTS = { offers: 45, visits: 18, calls: 7, contacts: 4, viewsCap: 120, viewsFactor: 0.15 };

// Coefficient de prix : 1 tant que le tarif est au niveau (ou en dessous) du
// prix conseillé, puis décroît de ~2 points par % de dépassement, plancher
// à 0,45. Ex. : +5 % → 0,90 · +10 % → 0,80 · +20 % → 0,60 · +27,5 % → 0,45.
const PRICE = { penaltyPerPct: 0.02, floor: 0.45 };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function baseScore(s: StatSnapshot) {
  const raw =
    s.offers * WEIGHTS.offers +
    s.visits * WEIGHTS.visits +
    s.calls * WEIGHTS.calls +
    s.contacts * WEIGHTS.contacts +
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
 * @param latest    Dernier relevé hebdomadaire (ou null si aucun).
 * @param opts      Contexte optionnel : ancienneté du mandat, prix / prix de conseil.
 */
export function analyzeVehicle(
  latest: StatSnapshot | null,
  opts?: { mandateDays?: number; price?: number; advisedPrice?: number | null },
): Diagnostic | null {
  if (!latest) return null;

  const { views, contacts, visits, offers } = latest;

  // Corrélation prix ↔ stats : l'indice statistique brut est pondéré par le
  // coefficient de prix, de sorte qu'un même niveau de traction donne un
  // pourcentage de vente d'autant plus faible que le tarif dépasse le conseil.
  const overagePct = priceOveragePct(opts?.price, opts?.advisedPrice);
  const base = Math.round(clamp(baseScore(latest) * priceFactor(overagePct), 0, 100));

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

  // 3. Beaucoup vue mais peu de contacts → prix trop élevé.
  if (views >= THRESHOLDS.viewsHigh && contacts <= THRESHOLDS.contactsLow) {
    return {
      score: Math.min(base, 30),
      verdict: `Votre annonce est beaucoup vue mais génère peu de contacts : le prix est probablement trop élevé${priceGapText}.`,
      tone: "bad",
      suggestPriceDrop: true,
    };
  }

  // 4. Peu de visibilité → le tarif fait sortir des recherches des acheteurs.
  if (views < THRESHOLDS.viewsLow) {
    return {
      score: Math.min(base, 30),
      verdict: `Votre annonce est peu vue : à ce prix, elle sort des recherches des acheteurs. Le tarif est probablement trop élevé${priceGapText}.`,
      tone: "bad",
      suggestPriceDrop: true,
    };
  }

  // 5. Des contacts mais aucune visite → le prix stoppe l'intérêt avant la visite.
  if (contacts >= THRESHOLDS.contactsSome && visits === 0) {
    return {
      score: Math.min(base, 35),
      verdict: `On vous contacte mais personne ne se déplace : à ce tarif, l'intérêt s'arrête avant la visite. Le prix est probablement trop élevé${priceGapText}.`,
      tone: "bad",
      suggestPriceDrop: true,
    };
  }

  // 6. Rien de décisif : phrase d'attente, sauf mandat déjà ancien sans traction.
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
  opts?: { mandateDays?: number; price?: number; advisedPrice?: number | null },
): Diagnostic | null {
  const weekly = weeklyActivity(latest, previous);
  if (!weekly) return null;
  return analyzeVehicle(weekly, opts);
}
