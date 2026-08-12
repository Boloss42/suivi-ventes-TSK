/**
 * Limiteur de débit en mémoire (fenêtre glissante), volontairement simple.
 *
 * ⚠️ Portée : la mémoire est **par processus**. En multi-instances (scaling
 * Railway), la limite n'est donc pas partagée — c'est un premier rempart
 * anti-force-brute, pas une garantie stricte. Pour du robuste multi-instances,
 * passer à un store partagé (Redis/Upstash) derrière la même interface.
 *
 * `now` est injectable pour rendre la logique testable sans horloge réelle.
 */

export type RateLimitOptions = {
  limit: number; // nb d'événements autorisés dans la fenêtre
  windowMs: number; // durée de la fenêtre en ms
};

export type RateLimitStatus = {
  blocked: boolean;
  retryAfterSeconds: number; // délai avant qu'un créneau se libère (0 si non bloqué)
};

// clé -> horodatages (ms) des événements récents.
const buckets = new Map<string, number[]>();

/** Élague les événements hors fenêtre et renvoie ceux qui restent. */
function prune(key: string, windowStart: number): number[] {
  const kept = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (kept.length === 0) buckets.delete(key);
  else buckets.set(key, kept);
  return kept;
}

function statusFrom(events: number[], opts: RateLimitOptions, now: number): RateLimitStatus {
  if (events.length < opts.limit) return { blocked: false, retryAfterSeconds: 0 };
  const oldest = events[0];
  const retryMs = oldest + opts.windowMs - now;
  return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) };
}

/**
 * Indique si la clé a atteint la limite dans la fenêtre — **sans** enregistrer
 * d'événement. À appeler avant de tenter l'action protégée.
 */
export function isRateLimited(
  key: string,
  opts: RateLimitOptions,
  now: number = Date.now(),
): RateLimitStatus {
  const events = prune(key, now - opts.windowMs);
  return statusFrom(events, opts, now);
}

/**
 * Enregistre un événement (ex. un échec de connexion) et renvoie le statut
 * **après** enregistrement (donc `blocked: true` dès que le seuil est atteint).
 */
export function recordAttempt(
  key: string,
  opts: RateLimitOptions,
  now: number = Date.now(),
): RateLimitStatus {
  const events = prune(key, now - opts.windowMs);
  events.push(now);
  buckets.set(key, events);
  return statusFrom(events, opts, now);
}

/** Réinitialise une clé (ex. après une action réussie). */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
