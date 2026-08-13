import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { getBaseUrl } from "@/lib/appUrl";

const INVITE_VALIDITY_DAYS = 7;

export function generateInviteToken() {
  return randomBytes(24).toString("hex");
}

export function inviteExpiresAt() {
  return new Date(Date.now() + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

/** URL absolue de la page d'activation (domaine canonique, cf. getBaseUrl). */
export async function buildInviteUrl(token: string) {
  return `${await getBaseUrl()}/activate/${token}`;
}

/** URL absolue du lien de partage public d'une annonce (domaine canonique). */
export async function buildShareUrl(token: string) {
  return `${await getBaseUrl()}/a/${token}`;
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
