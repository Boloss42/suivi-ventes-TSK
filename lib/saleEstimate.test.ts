import { describe, it, expect } from "vitest";
import { estimateSaleTime } from "@/lib/saleEstimate";
import type { Diagnostic, StatSnapshot } from "@/lib/diagnostic";

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

const diag = (o: Partial<Diagnostic> = {}): Diagnostic => ({
  score: 50,
  verdict: "",
  tone: "neutral",
  suggestPriceDrop: false,
  ...o,
});

describe("estimateSaleTime", () => {
  it("renvoie null sans diagnostic ou sans relevé", () => {
    expect(estimateSaleTime(null, snap())).toBeNull();
    expect(estimateSaleTime(diag(), null)).toBeNull();
  });

  it("offre reçue → vente imminente", () => {
    const e = estimateSaleTime(diag(), snap({ offers: 1 }))!;
    expect(e.headline).toBe("Vente imminente");
    expect(e.tone).toBe("good");
  });

  it("visite en cours (sans offre) → sous 2 à 3 semaines", () => {
    const e = estimateSaleTime(diag(), snap({ visits: 1 }))!;
    expect(e.headline).toBe("Sous 2 à 3 semaines");
    expect(e.tone).toBe("good");
  });

  it("prix trop élevé → vente ralentie", () => {
    const e = estimateSaleTime(diag({ suggestPriceDrop: true, tone: "bad" }), snap())!;
    expect(e.headline).toBe("Ralentie au prix actuel");
    expect(e.tone).toBe("warning");
  });

  it("bonne traction sans visite → fourchette 3 à 6 semaines", () => {
    const e = estimateSaleTime(diag({ score: 50 }), snap())!;
    expect(e.headline).toBe("Environ 3 à 6 semaines");
  });

  it("signaux faibles → trop tôt pour estimer", () => {
    const e = estimateSaleTime(diag({ score: 10 }), snap())!;
    expect(e.headline).toBe("Trop tôt pour estimer");
  });
});
