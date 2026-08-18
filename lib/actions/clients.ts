"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { clientSchema } from "@/lib/validation";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { generateInviteToken, inviteExpiresAt, buildInviteUrl, generateQrSvg } from "@/lib/invite";
import { sendActivationEmail } from "@/lib/emails/activation";

export type ClientActionState = {
  error?: string;
  success?: {
    clientId: string;
    email: string;
    inviteUrl: string;
    qrSvg: string;
  };
};

export async function createClient(
  _prevState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const { agencyId, userId } = await requireStaff();

  const parsed = clientSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  // Mot de passe temporaire inutilisable : le client définit le sien via le
  // lien d'activation. Uniquement pour satisfaire la contrainte NOT NULL.
  const placeholderHash = await hashPassword(generateTempPassword());
  const inviteToken = generateInviteToken();

  const client = await prisma.client.create({
    data: {
      agency: { connect: { id: agencyId } },
      assignedStaff: { connect: { id: userId } },
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      user: {
        create: {
          email,
          passwordHash: placeholderHash,
          role: "CLIENT" as const,
          inviteToken,
          inviteTokenExpiresAt: inviteExpiresAt(),
        },
      },
    },
  });

  revalidatePath("/staff/clients");

  const inviteUrl = await buildInviteUrl(inviteToken);
  const qrSvg = await generateQrSvg(inviteUrl);

  // Envoi de l'email d'activation (non bloquant : en cas d'échec, l'agent
  // conserve le lien et le QR ci-dessous pour un partage manuel).
  const advisor = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true },
  });
  await sendActivationEmail(email, {
    firstName: parsed.data.firstName,
    inviteUrl,
    advisorName: advisor?.firstName,
  });

  return {
    success: { clientId: client.id, email, inviteUrl, qrSvg },
  };
}

export type UpdateClientState = { error?: string; success?: boolean };

export async function updateClient(
  clientId: string,
  _prevState: UpdateClientState,
  formData: FormData,
): Promise<UpdateClientState> {
  const { agencyId, userId } = await requireStaff();

  const parsed = clientSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const email = parsed.data.email.toLowerCase();
  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId, assignedStaffId: userId },
  });
  if (!client) {
    return { error: "Client introuvable." };
  }

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== client.userId) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  await prisma.$transaction([
    prisma.client.update({
      where: { id: clientId },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
      },
    }),
    prisma.user.update({
      where: { id: client.userId },
      data: { email },
    }),
  ]);

  revalidatePath("/staff/clients");
  revalidatePath(`/staff/clients/${clientId}`);

  return { success: true };
}

export type InviteLinkState = { error?: string; inviteUrl?: string; qrSvg?: string };

/** Régénère un lien d'activation (première connexion ou mot de passe oublié). */
export async function regenerateInviteLink(
  _prevState: InviteLinkState,
  formData: FormData,
): Promise<InviteLinkState> {
  const { agencyId, userId } = await requireStaff();
  const clientId = formData.get("clientId") as string;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId, assignedStaffId: userId },
    include: { user: { select: { email: true } } },
  });
  if (!client) {
    return { error: "Client introuvable." };
  }

  const inviteToken = generateInviteToken();

  await prisma.user.update({
    where: { id: client.userId },
    data: { inviteToken, inviteTokenExpiresAt: inviteExpiresAt() },
  });

  revalidatePath(`/staff/clients/${clientId}`);

  const inviteUrl = await buildInviteUrl(inviteToken);
  const qrSvg = await generateQrSvg(inviteUrl);

  // Renvoi de l'email d'activation (non bloquant).
  const advisor = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true },
  });
  await sendActivationEmail(client.user.email, {
    firstName: client.firstName,
    inviteUrl,
    advisorName: advisor?.firstName,
  });

  return { inviteUrl, qrSvg };
}

export type DeleteClientState = { error?: string };

/**
 * Suppression d'un client (et de son compte de connexion). Bloquée tant qu'il
 * a des véhicules associés (pas de suppression en cascade de l'historique
 * véhicule depuis ici — il faut d'abord les retirer). Renvoie une erreur
 * explicite plutôt que de lever une exception : voir deleteVehicle pour le
 * même raisonnement (un throw dans une action appelée en fire-and-forget
 * laisse l'agent sans aucun retour visible).
 */
export async function deleteClient(formData: FormData): Promise<DeleteClientState> {
  const { agencyId, userId } = await requireStaff();
  const clientId = formData.get("clientId") as string;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId, assignedStaffId: userId },
  });
  if (!client) {
    return { error: "Client introuvable (déjà supprimé ou non autorisé)." };
  }

  const vehicleCount = await prisma.vehicle.count({ where: { clientId } });
  if (vehicleCount > 0) {
    return {
      error: `Impossible de supprimer : ce client a encore ${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""} associé${vehicleCount > 1 ? "s" : ""}. Supprimez-le${vehicleCount > 1 ? "s" : ""} d'abord.`,
    };
  }

  try {
    await prisma.user.delete({ where: { id: client.userId } });
  } catch (error) {
    console.error("[deleteClient] échec de la suppression :", error);
    return { error: "La suppression a échoué. Réessayez." };
  }

  revalidatePath("/staff/clients");
  return {};
}
