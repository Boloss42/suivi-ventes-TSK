"use server";

import { revalidatePath } from "next/cache";
import type { OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { offerSchema } from "@/lib/validation";
import { formatPrice } from "@/lib/format";
import { getBaseUrl } from "@/lib/appUrl";
import { sendOfferReceivedEmail } from "@/lib/emails/offerReceived";

export type CreateOfferState = { error?: string; success?: boolean };

/**
 * L'agent enregistre une offre d'achat reçue pour un véhicule. Notifie le
 * client (in-app + email). Isolation stricte : agence + agent assigné.
 */
export async function createOffer(
  _prevState: CreateOfferState,
  formData: FormData,
): Promise<CreateOfferState> {
  const { agencyId, userId } = await requireStaff();

  const parsed = offerSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    amount: formData.get("amount"),
    buyerName: formData.get("buyerName") || undefined,
    buyerContact: formData.get("buyerContact") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: parsed.data.vehicleId, agencyId, client: { assignedStaffId: userId } },
    select: {
      id: true,
      make: true,
      model: true,
      clientId: true,
      client: { select: { firstName: true, user: { select: { email: true } } } },
    },
  });
  if (!vehicle) {
    return { error: "Véhicule introuvable." };
  }

  await prisma.offer.create({
    data: {
      vehicleId: vehicle.id,
      amount: parsed.data.amount,
      buyerName: parsed.data.buyerName,
      buyerContact: parsed.data.buyerContact,
      note: parsed.data.note,
    },
  });

  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const amountText = formatPrice(parsed.data.amount);

  // Notification in-app.
  await prisma.notification.create({
    data: {
      clientId: vehicle.clientId,
      vehicleId: vehicle.id,
      type: "OFFER",
      message: `Vous avez reçu une offre de ${amountText} pour votre ${vehicleLabel}.`,
    },
  });

  // Email (non bloquant).
  const advisor = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
  await sendOfferReceivedEmail(vehicle.client.user.email, {
    firstName: vehicle.client.firstName,
    vehicleLabel,
    amount: amountText,
    buyerName: parsed.data.buyerName ?? null,
    advisorPhone: advisor?.phone,
    link: `${await getBaseUrl()}/client/vehicles/${vehicle.id}`,
  });

  revalidatePath(`/staff/vehicles/${vehicle.id}`);
  revalidatePath(`/client/vehicles/${vehicle.id}`);

  return { success: true };
}

/** Met à jour le statut d'une offre (accepter, refuser, contre-proposer). */
export async function updateOfferStatus(offerId: string, status: OfferStatus) {
  const { agencyId, userId } = await requireStaff();

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, vehicle: { agencyId, client: { assignedStaffId: userId } } },
    select: { id: true, vehicleId: true },
  });
  if (!offer) return;

  await prisma.offer.update({ where: { id: offer.id }, data: { status } });

  revalidatePath(`/staff/vehicles/${offer.vehicleId}`);
  revalidatePath(`/client/vehicles/${offer.vehicleId}`);
}

/** Supprime une offre (saisie erronée). */
export async function deleteOffer(formData: FormData) {
  const { agencyId, userId } = await requireStaff();
  const offerId = formData.get("offerId") as string;

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, vehicle: { agencyId, client: { assignedStaffId: userId } } },
    select: { id: true, vehicleId: true },
  });
  if (!offer) return;

  await prisma.offer.delete({ where: { id: offer.id } });

  revalidatePath(`/staff/vehicles/${offer.vehicleId}`);
  revalidatePath(`/client/vehicles/${offer.vehicleId}`);
}
