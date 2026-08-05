import { randomBytes } from "crypto";
import { headers } from "next/headers";
import QRCode from "qrcode";

const INVITE_VALIDITY_DAYS = 7;

export function generateInviteToken() {
  return randomBytes(24).toString("hex");
}

export function inviteExpiresAt() {
  return new Date(Date.now() + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

/** URL absolue de la page d'activation, déduite de la requête en cours. */
export async function buildInviteUrl(token: string) {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/activate/${token}`;
}

/** QR code de l'URL fournie, au format SVG (chaîne de balisage à injecter directement). */
export async function generateQrSvg(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 220,
    color: { dark: "#0d0d0d", light: "#ffffff" },
  });
}
