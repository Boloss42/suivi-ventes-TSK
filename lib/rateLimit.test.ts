import { describe, it, expect } from "vitest";
import { isRateLimited, recordAttempt, clearRateLimit } from "@/lib/rateLimit";

const OPTS = { limit: 3, windowMs: 10_000 };

// Chaque test utilise une clé unique : la mémoire est partagée au niveau module.
let n = 0;
const uniqueKey = () => `test-${n++}`;

describe("rateLimit", () => {
  it("n'est pas bloqué tant que la limite n'est pas atteinte", () => {
    const key = uniqueKey();
    const t0 = 1_000_000;
    expect(recordAttempt(key, OPTS, t0).blocked).toBe(false);
    expect(recordAttempt(key, OPTS, t0 + 1).blocked).toBe(false);
    // 3e tentative : atteint la limite -> bloqué.
    expect(recordAttempt(key, OPTS, t0 + 2).blocked).toBe(true);
  });

  it("isRateLimited n'enregistre pas d'événement", () => {
    const key = uniqueKey();
    const t0 = 2_000_000;
    // Vérifier 5 fois ne doit pas consommer le quota.
    for (let i = 0; i < 5; i++) expect(isRateLimited(key, OPTS, t0).blocked).toBe(false);
    // On peut ensuite enregistrer jusqu'à la limite.
    recordAttempt(key, OPTS, t0);
    recordAttempt(key, OPTS, t0);
    expect(recordAttempt(key, OPTS, t0).blocked).toBe(true);
  });

  it("expose un retryAfterSeconds cohérent une fois bloqué", () => {
    const key = uniqueKey();
    const t0 = 3_000_000;
    recordAttempt(key, OPTS, t0);
    recordAttempt(key, OPTS, t0);
    const s = recordAttempt(key, OPTS, t0);
    expect(s.blocked).toBe(true);
    // Le plus ancien événement (t0) se libère au bout de windowMs (10 s).
    expect(s.retryAfterSeconds).toBe(10);
  });

  it("se débloque quand les événements sortent de la fenêtre", () => {
    const key = uniqueKey();
    const t0 = 4_000_000;
    recordAttempt(key, OPTS, t0);
    recordAttempt(key, OPTS, t0);
    expect(recordAttempt(key, OPTS, t0).blocked).toBe(true);
    // 10,001 s plus tard, les 3 événements sont hors fenêtre.
    expect(isRateLimited(key, OPTS, t0 + 10_001).blocked).toBe(false);
  });

  it("clearRateLimit réinitialise la clé", () => {
    const key = uniqueKey();
    const t0 = 5_000_000;
    recordAttempt(key, OPTS, t0);
    recordAttempt(key, OPTS, t0);
    recordAttempt(key, OPTS, t0);
    expect(isRateLimited(key, OPTS, t0).blocked).toBe(true);
    clearRateLimit(key);
    expect(isRateLimited(key, OPTS, t0).blocked).toBe(false);
  });
});
