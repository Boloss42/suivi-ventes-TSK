import type { Diagnostic, StatSnapshot } from "@/lib/diagnostic";

// Estimation *indicative* du délai de vente, adossée au diagnostic existant
// (même logique prix ↔ traction) plutôt qu'à un faux chiffre précis : on
// affiche une fourchette quand les signaux sont bons, et un message honnête
// (annonce qui démarre / vente ralentie par le prix) sinon.

export type SaleEstimateTone = "good" | "neutral" | "warning";

export type SaleEstimate = {
  headline: string;
  detail: string;
  tone: SaleEstimateTone;
};

export function estimateSaleTime(
  diagnostic: Diagnostic | null,
  latest: StatSnapshot | null,
): SaleEstimate | null {
  if (!diagnostic || !latest) return null;

  // Offres reçues : vente quasi acquise.
  if (latest.offers >= 1) {
    return {
      headline: "Vente imminente",
      detail:
        "Vous avez reçu au moins une offre : la vente peut se conclure sous quelques jours.",
      tone: "good",
    };
  }

  // Visites en cours : forte intention d'achat.
  if (latest.visits >= 1) {
    return {
      headline: "Sous 2 à 3 semaines",
      detail:
        "Des acheteurs se déplacent pour voir le véhicule : une vente à court terme est probable.",
      tone: "good",
    };
  }

  // Le diagnostic conclut à un tarif trop élevé : la vente est ralentie.
  if (diagnostic.suggestPriceDrop) {
    return {
      headline: "Ralentie au prix actuel",
      detail:
        "À ce tarif, l'annonce ne convertit pas assez pour estimer une date fiable. Un ajustement de prix accélérerait nettement la vente.",
      tone: "warning",
    };
  }

  // Traction correcte sans visite encore : fourchette prudente.
  if (diagnostic.score >= 45) {
    return {
      headline: "Environ 3 à 6 semaines",
      detail:
        "L'annonce génère de l'intérêt : à ce rythme, une vente dans les prochaines semaines est plausible.",
      tone: "neutral",
    };
  }

  // Trop tôt / signaux faibles.
  return {
    headline: "Trop tôt pour estimer",
    detail:
      "L'annonce démarre : l'estimation s'affinera avec les prochains relevés hebdomadaires.",
    tone: "neutral",
  };
}
