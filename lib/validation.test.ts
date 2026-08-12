import { describe, it, expect } from "vitest";
import {
  clientSchema,
  priceProposalSchema,
  activateSchema,
  forgotPasswordSchema,
  vehicleSchema,
} from "@/lib/validation";

describe("clientSchema", () => {
  it("accepte un client valide (téléphone optionnel)", () => {
    expect(clientSchema.safeParse({ firstName: "Jean", lastName: "Martin", email: "j@ex.fr" }).success).toBe(true);
  });

  it("rejette un email invalide", () => {
    expect(
      clientSchema.safeParse({ firstName: "Jean", lastName: "Martin", email: "pas-un-email" }).success,
    ).toBe(false);
  });

  it("rejette un prénom vide", () => {
    expect(clientSchema.safeParse({ firstName: "", lastName: "Martin", email: "j@ex.fr" }).success).toBe(false);
  });
});

describe("priceProposalSchema", () => {
  it("coerce le prix depuis une chaîne", () => {
    const r = priceProposalSchema.safeParse({ vehicleId: "v1", proposedPrice: "1500" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.proposedPrice).toBe(1500);
  });

  it("refuse un prix nul ou négatif", () => {
    expect(priceProposalSchema.safeParse({ vehicleId: "v1", proposedPrice: "0" }).success).toBe(false);
  });
});

describe("activateSchema", () => {
  it("exige au moins 8 caractères", () => {
    expect(activateSchema.safeParse({ password: "court", confirmPassword: "court" }).success).toBe(false);
  });

  it("exige des mots de passe identiques", () => {
    expect(activateSchema.safeParse({ password: "motdepasse1", confirmPassword: "motdepasse2" }).success).toBe(false);
  });

  it("accepte deux mots de passe valides identiques", () => {
    expect(activateSchema.safeParse({ password: "motdepasse1", confirmPassword: "motdepasse1" }).success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("valide un email correct et rejette un email incorrect", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.fr" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("vehicleSchema", () => {
  it("coerce année/km/prix et accepte un prix de conseil vide", () => {
    const r = vehicleSchema.safeParse({
      make: "Peugeot",
      model: "308",
      year: "2019",
      mileage: "62000",
      fuelType: "Diesel",
      reference: "AB-123-CD",
      price: "13900",
      advisedPrice: "",
      status: "EN_VENTE",
      depositDate: "2026-06-29",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.year).toBe(2019);
      expect(r.data.mileage).toBe(62000);
      expect(r.data.price).toBe(13900);
    }
  });

  it("rejette un statut inconnu", () => {
    const r = vehicleSchema.safeParse({
      make: "Peugeot",
      model: "308",
      year: "2019",
      mileage: "62000",
      fuelType: "Diesel",
      reference: "AB-123-CD",
      price: "13900",
      status: "INCONNU",
      depositDate: "2026-06-29",
    });
    expect(r.success).toBe(false);
  });
});
