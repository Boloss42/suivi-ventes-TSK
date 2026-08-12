import { describe, it, expect } from "vitest";
import {
  analyzeVehicle,
  weeklyActivity,
  diagnoseFromSnapshots,
  type StatSnapshot,
} from "@/lib/diagnostic";

// Fabrique un relevé, tous les compteurs à 0 sauf ceux passés.
const snap = (o: Partial<StatSnapshot> = {}): StatSnapshot => ({
  views: 0,
  contacts: 0,
  calls: 0,
  favorites: 0,
  visits: 0,
  offers: 0,
  ...o,
});

describe("weeklyActivity", () => {
  it("renvoie null s'il manque un des deux relevés", () => {
    expect(weeklyActivity(null, snap())).toBeNull();
    expect(weeklyActivity(snap(), null)).toBeNull();
  });

  it("calcule le gain de la semaine (dernier − précédent)", () => {
    const w = weeklyActivity(snap({ views: 120, contacts: 8 }), snap({ views: 100, contacts: 5 }));
    expect(w).toEqual(snap({ views: 20, contacts: 3 }));
  });

  it("ramène les écarts négatifs (saisie incohérente) à 0", () => {
    const w = weeklyActivity(snap({ views: 90 }), snap({ views: 100 }));
    expect(w?.views).toBe(0);
  });
});

describe("analyzeVehicle", () => {
  it("renvoie null sans relevé", () => {
    expect(analyzeVehicle(null)).toBeNull();
  });

  it("conclut à une vente très probable dès qu'il y a une offre", () => {
    const d = analyzeVehicle(snap({ offers: 1 }))!;
    expect(d.tone).toBe("good");
    expect(d.suggestPriceDrop).toBe(false);
    expect(d.score).toBeGreaterThanOrEqual(78);
  });

  it("est positif quand des acheteurs visitent (sans offre)", () => {
    const d = analyzeVehicle(snap({ visits: 2 }))!;
    expect(d.tone).toBe("good");
    expect(d.suggestPriceDrop).toBe(false);
    expect(d.score).toBeGreaterThanOrEqual(55);
    expect(d.score).toBeLessThanOrEqual(74);
  });

  it("beaucoup de vues mais peu de contacts → prix trop élevé", () => {
    const d = analyzeVehicle(snap({ views: 80, contacts: 0 }))!;
    expect(d.tone).toBe("bad");
    expect(d.suggestPriceDrop).toBe(true);
  });

  it("annonce peu vue → prix trop élevé", () => {
    const d = analyzeVehicle(snap({ views: 5 }))!;
    expect(d.tone).toBe("bad");
    expect(d.suggestPriceDrop).toBe(true);
  });

  it("des contacts mais aucune visite → prix trop élevé", () => {
    const d = analyzeVehicle(snap({ views: 30, contacts: 3, visits: 0 }))!;
    expect(d.tone).toBe("bad");
    expect(d.suggestPriceDrop).toBe(true);
  });

  it("mandat ancien sans traction → avertissement + suggestion de baisse", () => {
    const d = analyzeVehicle(snap({ views: 30, contacts: 1, visits: 0 }), { mandateDays: 60 })!;
    expect(d.tone).toBe("warning");
    expect(d.suggestPriceDrop).toBe(true);
  });

  it("annonce qui démarre → message neutre d'attente", () => {
    const d = analyzeVehicle(snap({ views: 30, contacts: 1, visits: 0 }), { mandateDays: 3 })!;
    expect(d.tone).toBe("neutral");
    expect(d.suggestPriceDrop).toBe(false);
  });

  it("un prix au-dessus du conseil abaisse l'indice à traction égale", () => {
    const stats = snap({ views: 40, contacts: 1, visits: 0 });
    const sansEcart = analyzeVehicle(stats, { mandateDays: 3 })!;
    const avecEcart = analyzeVehicle(stats, { mandateDays: 3, price: 13000, advisedPrice: 10000 })!;
    expect(avecEcart.score).toBeLessThan(sansEcart.score);
  });
});

describe("diagnoseFromSnapshots (modèle cumulé)", () => {
  it("renvoie null tant qu'il n'y a pas deux relevés", () => {
    expect(diagnoseFromSnapshots(snap({ views: 10 }), null)).toBeNull();
    expect(diagnoseFromSnapshots(null, snap({ views: 10 }))).toBeNull();
  });

  it("analyse le GAIN de la semaine, pas le cumul", () => {
    // Cumul élevé (visites déjà présentes), mais aucune activité NOUVELLE cette
    // semaine : le diagnostic doit refléter la semaine (pas le total cumulé).
    const latest = snap({ visits: 3, views: 500, contacts: 20 });
    const previous = snap({ visits: 3, views: 450, contacts: 18 });
    const d = diagnoseFromSnapshots(latest, previous)!;
    // Sur le cumul on aurait "good" (visits: 3) ; sur le gain hebdo (visits: 0,
    // contacts: 2, visites: 0) on conclut à un prix trop élevé.
    expect(d.tone).not.toBe("good");
    expect(d.suggestPriceDrop).toBe(true);
  });
});
