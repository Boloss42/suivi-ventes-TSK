"use server";

import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";
import { generateInviteToken, buildShareUrl, generateQrSvg } from "@/lib/invite";

export type ShareLinkState = {
  error?: string;
  shareUrl?: string;
  qrSvg?: string;
};

/**
 * Génère (ou récupère) le lien de partage public d'un véhicule pour le client
 * propriétaire, et renvoie l'URL + un QR code.
 */
export async function createShareLink(
  _prevState: ShareLinkState,
  formData: FormData,
): Promise<ShareLinkState> {
  const { clientId } = await requireClient();
  const vehicleId = formData.get("vehicleId") as string;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, clientId },
    select: { id: true, shareToken: true },
  });
  if (!vehicle) {
    return { error: "Véhicule introuvable." };
  }

  let token = vehicle.shareToken;
  if (!token) {
    token = generateInviteToken();
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { shareToken: token } });
  }

  const shareUrl = await buildShareUrl(token);
  const qrSvg = await generateQrSvg(shareUrl);

  return { shareUrl, qrSvg };
}
