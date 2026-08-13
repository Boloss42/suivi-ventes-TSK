"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClient, requireStaff } from "@/lib/session";
import { priceProposalSchema } from "@/lib/validation";
import { formatPrice } from "@/lib/format";
import { getBaseUrl } from "@/lib/appUrl";
import { sendPriceSuggestionEmail } from "@/lib/emails/priceSuggestion";

export type ProposePriceState = { error?: string; success?: boolean };

export async function proposePriceAdjustment(
  _prevState: ProposePriceState,
  formData: FormData,
): Promise<ProposePriceState> {
  const { clientId } = await requireClient();

  const parsed = priceProposalSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    proposedPrice: formData.get("proposedPrice"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parsed.data.vehicleId },
    select: { clientId: true },
  });
  if (!vehicle || vehicle.clientId !== clientId) {
    return { error: "Véhicule introuvable." };
  }

  const existingPending = await prisma.priceProposal.findFirst({
    where: { vehicleId: parsed.data.vehicleId, status: "PENDING" },
  });
  if (existingPending) {
    return { error: "Une proposition est déjà en attente pour ce véhicule." };
  }

  await prisma.priceProposal.create({
    data: {
      vehicleId: parsed.data.vehicleId,
      clientId,
      proposedPrice: parsed.data.proposedPrice,
      message: parsed.data.message,
    },
  });

  revalidatePath(`/client/vehicles/${parsed.data.vehicleId}`);
  revalidatePath(`/staff/vehicles/${parsed.data.vehicleId}`);

  return { success: true };
}

export async function respondToPriceProposal(
  proposalId: string,
  decision: "ACCEPTED" | "REJECTED",
) {
  const { agencyId, userId } = await requireStaff();

  const proposal = await prisma.priceProposal.findFirst({
    where: { id: proposalId, vehicle: { agencyId, client: { assignedStaffId: userId } } },
    include: { vehicle: { select: { id: true, make: true, model: true } } },
  });
  if (!proposal || proposal.status !== "PENDING") return;

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.priceProposal.update({
      where: { id: proposalId },
      data: { status: decision, respondedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        clientId: proposal.clientId,
        vehicleId: proposal.vehicleId,
        type: "PRICE_PROPOSAL",
        message:
          decision === "ACCEPTED"
            ? `Votre proposition de prix pour votre ${proposal.vehicle.make} ${proposal.vehicle.model} a été acceptée.`
            : `Votre proposition de prix pour votre ${proposal.vehicle.make} ${proposal.vehicle.model} a été déclinée.`,
      },
    }),
  ];

  if (decision === "ACCEPTED") {
    operations.push(
      prisma.vehicle.update({
        where: { id: proposal.vehicleId },
        data: { price: proposal.proposedPrice },
      }),
      prisma.priceChange.create({
        data: { vehicleId: proposal.vehicleId, price: proposal.proposedPrice },
      }),
    );
  }

  await prisma.$transaction(operations);

  revalidatePath(`/staff/vehicles/${proposal.vehicleId}`);
  revalidatePath(`/client/vehicles/${proposal.vehicleId}`);
  revalidatePath("/staff/dashboard");
}

export type SuggestPriceState = { error?: string; success?: boolean };

/**
 * L'agent recommande à son client de baisser le prix net vendeur. Envoie une
 * notification in-app ET un email (non bloquant) au client propriétaire.
 * Isolation stricte : agence + agent assigné.
 */
export async function suggestPriceDropToClient(
  _prevState: SuggestPriceState,
  formData: FormData,
): Promise<SuggestPriceState> {
  const { agencyId, userId } = await requireStaff();

  const parsed = priceProposalSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    proposedPrice: formData.get("proposedPrice"),
    message: formData.get("message") || undefined,
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
      price: true,
      clientId: true,
      client: { select: { firstName: true, user: { select: { email: true } } } },
    },
  });
  if (!vehicle) {
    return { error: "Véhicule introuvable." };
  }

  if (parsed.data.proposedPrice >= vehicle.price) {
    return { error: "Le prix recommandé doit être inférieur au prix actuel." };
  }

  // Conseiller (l'agent qui envoie) : nom + téléphone pour le canal « contacter ».
  const advisor = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, phone: true },
  });

  const vehicleLabel = `${vehicle.make} ${vehicle.model}`;
  const suggestedPrice = formatPrice(parsed.data.proposedPrice);
  // Message direct mais constructif : au prix actuel le véhicule ne se vend pas ;
  // un ajustement est nécessaire. Le conseiller reste disponible pour en parler.
  const base = `Au prix actuel, votre ${vehicleLabel} ne trouve pas preneur. Pour qu'il se vende, votre conseiller recommande d'ajuster le prix à ${suggestedPrice}. Contactez-le pour en parler.`;
  const message = parsed.data.message ? `${base} « ${parsed.data.message} »` : base;

  // Historisation de la recommandation (staff → client) + notification in-app
  // (cloche client), dans une transaction pour rester cohérent.
  await prisma.$transaction([
    prisma.priceSuggestion.create({
      data: {
        vehicleId: vehicle.id,
        amount: parsed.data.proposedPrice,
        message: parsed.data.message,
      },
    }),
    prisma.notification.create({
      data: {
        clientId: vehicle.clientId,
        vehicleId: vehicle.id,
        type: "PRICE_PROPOSAL",
        message,
      },
    }),
  ]);

  // Email (non bloquant : l'échec n'empêche pas la notification in-app).
  await sendPriceSuggestionEmail(vehicle.client.user.email, {
    firstName: vehicle.client.firstName,
    vehicleLabel,
    currentPrice: formatPrice(vehicle.price),
    suggestedPrice,
    message: parsed.data.message ?? null,
    advisorName: advisor?.firstName,
    advisorPhone: advisor?.phone,
    link: `${await getBaseUrl()}/client/vehicles/${vehicle.id}`,
  });

  revalidatePath(`/staff/vehicles/${vehicle.id}`);
  revalidatePath(`/client/vehicles/${vehicle.id}`);

  return { success: true };
}
