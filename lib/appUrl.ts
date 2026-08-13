import { headers } from "next/headers";

/**
 * URL de base canonique de l'application, pour construire des liens sûrs
 * (emails d'activation / réinitialisation, liens de partage, liens véhicule).
 *
 * Sécurité : en production on s'appuie sur `APP_URL` et **jamais** sur l'en-tête
 * `Host` de la requête, qui est falsifiable — un attaquant pourrait sinon
 * empoisonner le domaine d'un lien de réinitialisation envoyé par email
 * (« reset poisoning ») et détourner le jeton.
 *
 * `APP_URL` doit être défini en prod (ex. https://myvitrine.pro). En local, s'il
 * est absent, on retombe sur l'en-tête `Host` pour ne pas casser le dev.
 */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
