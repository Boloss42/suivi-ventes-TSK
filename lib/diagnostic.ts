// Moteur de diagnostic unifié : à partir des relevés hebdomadaires d'un
// véhicule, produit un indice de vendabilité (0-100), un verdict en langage
// naturel et une incitation éventuelle à baisser le prix.
//
// Principe directeur : le prix est le levier n°1. Tout signal négatif (peu de
// visibilité, beaucoup de vues sans contact, contacts sans visite, ancienneté
// sans traction) conclut sur un tarif trop élevé. Seules les offres et les
// visites donnent un verdict positif.

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

/**
 * @param latest    Dernier relevé hebdomadaire (ou null si aucun).
 * @param opts      Contexte optionnel : ancienneté du mandat, prix / prix de conseil.
 */
export function analyzeVehicle(
  latest: StatSnapshot | null,
  opts?: { mandateDays?: number; price?: number; advisedPrice?: number | null },
): Diagnostic | null {
  if (!latest) return null;

  const base = baseScore(latest);
  const { views, contacts, visits, offers } = latest;

  // Écart au prix de conseil, pour enrichir les verdicts « prix trop élevé ».
  let priceGapText = "";
  if (opts?.advisedPrice && opts?.price && opts.price > opts.advisedPrice) {
    const pct = Math.round(((opts.price - opts.advisedPrice) / opts.advisedPrice) * 100);
    if (pct >= 3) priceGapText = ` (~${pct} % au-dessus du prix de conseil)`;
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
