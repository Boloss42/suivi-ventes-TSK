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
  detailViews: 0,
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
    const w = weeklyActivity(
      snap({ views: 120, detailViews: 40, contacts: 8 }),
      snap({ views: 100, detailViews: 25, contacts: 5 }),
    );
    expect(w).toEqual(snap({ views: 20, detailViews: 15, contacts: 3 }));
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

  it("beaucoup de vues mais peu de contacts → prix trop élevé (taux de clic OK)", () => {
    // detailViews élevé + vuesTracked → le taux de clic est bon, on tombe donc
    // sur la branche « peu de contacts » et non sur celle du taux de clic.
    const d = analyzeVehicle(snap({ views: 80, detailViews: 8, contacts: 0 }), {
      vuesTracked: true,
    })!;
    expect(d.tone).toBe("bad");
    expect(d.suggestPriceDrop).toBe(true);
    expect(d.verdict).toMatch(/peu de contacts/);
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

  describe("taux de clic Apparitions → Vues", () => {
    it("beaucoup d'apparitions mais très peu de vues → l'annonce n'accroche pas", () => {
      const d = analyzeVehicle(snap({ views: 100, detailViews: 1, contacts: 2, visits: 0 }), {
        vuesTracked: true,
      })!;
      expect(d.tone).toBe("bad");
      expect(d.suggestPriceDrop).toBe(true);
      expect(d.verdict).toMatch(/cliqu/); // « peu cliquée »
    });

    it("n'est PAS déclenché tant que les Vues ne sont pas suivies (données historiques)", () => {
      // Mêmes chiffres, mais vuesTracked absent → pas de verdict « peu cliquée ».
      const d = analyzeVehicle(snap({ views: 100, detailViews: 1, contacts: 2, visits: 0 }))!;
      expect(d.verdict).not.toMatch(/cliqu/);
    });

    it("un bon taux de clic ne déclenche pas le verdict « peu cliquée »", () => {
      const d = analyzeVehicle(snap({ views: 100, detailViews: 12, contacts: 0 }), {
        vuesTracked: true,
      })!;
      expect(d.verdict).not.toMatch(/cliqu/);
    });

    it("les Vues pèsent dans l'indice : plus de vues → meilleur score, à traction égale", () => {
      const peuDeVues = analyzeVehicle(snap({ views: 55, detailViews: 1, contacts: 1 }), {
        mandateDays: 3,
        vuesTracked: true,
      })!;
      const plusDeVues = analyzeVehicle(snap({ views: 55, detailViews: 5, contacts: 1 }), {
        mandateDays: 3,
        vuesTracked: true,
      })!;
      expect(plusDeVues.score).toBeGreaterThan(peuDeVues.score);
    });
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
    expect(d.tone).not.toBe("good");
    expect(d.suggestPriceDrop).toBe(true);
  });

  it("exploite le taux de clic quand le cumul de Vues est renseigné", () => {
    // Gain hebdo : +100 apparitions, +1 vue → ~1 % de clics → « peu cliquée ».
    const latest = snap({ views: 1000, detailViews: 101, contacts: 30 });
    const previous = snap({ views: 900, detailViews: 100, contacts: 29 });
    const d = diagnoseFromSnapshots(latest, previous)!;
    expect(d.tone).toBe("bad");
    expect(d.suggestPriceDrop).toBe(true);
    expect(d.verdict).toMatch(/cliqu/);
  });
});
