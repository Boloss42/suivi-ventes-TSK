import { describe, it, expect } from "vitest";
import { formatPrice, formatMileage, daysSince, formatMandateAge } from "@/lib/format";

// Intl (fr-FR) insère des espaces insécables (fines) comme séparateur de
// milliers / avant le symbole. On normalise toutes les espaces pour comparer.
const norm = (s: string) => s.replace(/\s/g, " ");

const DAY = 86_400_000;

describe("formatMileage", () => {
  it("formate avec séparateur de milliers et l'unité km", () => {
    expect(norm(formatMileage(62000))).toBe("62 000 km");
  });
});

describe("formatPrice", () => {
  it("formate en euros sans décimales", () => {
    expect(norm(formatPrice(13900))).toBe("13 900 €");
  });
});

describe("daysSince", () => {
  it("renvoie 0 pour maintenant ou le futur", () => {
    expect(daysSince(new Date())).toBe(0);
    expect(daysSince(new Date(Date.now() + 5 * DAY))).toBe(0);
  });

  it("compte les jours écoulés depuis une date passée", () => {
    expect(daysSince(new Date(Date.now() - 3 * DAY))).toBe(3);
  });
});

describe("formatMandateAge", () => {
  it("exprime les jours au singulier / pluriel sous 45 jours", () => {
    expect(formatMandateAge(new Date(Date.now() - 1 * DAY))).toBe("1 jour");
    expect(formatMandateAge(new Date(Date.now() - 10 * DAY))).toBe("10 jours");
  });

  it("bascule en mois au-delà de ~45 jours", () => {
    expect(formatMandateAge(new Date(Date.now() - 90 * DAY))).toMatch(/mois$/);
  });
});
