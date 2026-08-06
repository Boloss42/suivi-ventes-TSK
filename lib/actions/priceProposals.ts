"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClient, requireStaff } from "@/lib/session";
import { priceProposalSchema } from "@/lib/validation";

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
    );
  }

  await prisma.$transaction(operations);

  revalidatePath(`/staff/vehicles/${proposal.vehicleId}`);
  revalidatePath(`/client/vehicles/${proposal.vehicleId}`);
}
