"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { staffAccountSchema } from "@/lib/validation";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { generateInviteToken, inviteExpiresAt, buildInviteUrl, generateQrSvg } from "@/lib/invite";

export type StaffAccountState = {
  error?: string;
  success?: { email: string; inviteUrl: string; qrSvg: string };
};

export async function createStaffAccount(
  _prevState: StaffAccountState,
  formData: FormData,
): Promise<StaffAccountState> {
  await requireStaff();

  const parsed = staffAccountSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  // Mot de passe temporaire inutilisable : le nouveau membre du staff définit
  // le sien via le lien d'activation, comme pour un client.
  const placeholderHash = await hashPassword(generateTempPassword());
  const inviteToken = generateInviteToken();

  await prisma.user.create({
    data: {
      email,
      passwordHash: placeholderHash,
      role: "STAFF",
      inviteToken,
      inviteTokenExpiresAt: inviteExpiresAt(),
    },
  });

  revalidatePath("/staff/team");

  const inviteUrl = await buildInviteUrl(inviteToken);
  const qrSvg = await generateQrSvg(inviteUrl);

  return { success: { email, inviteUrl, qrSvg } };
}

export type StaffInviteLinkState = { error?: string; inviteUrl?: string; qrSvg?: string };

export async function regenerateStaffInviteLink(
  _prevState: StaffInviteLinkState,
  formData: FormData,
): Promise<StaffInviteLinkState> {
  await requireStaff();
  const userId = formData.get("userId") as string;

  const user = await prisma.user.findFirst({ where: { id: userId, role: "STAFF" } });
  if (!user) {
    return { error: "Compte introuvable." };
  }

  const inviteToken = generateInviteToken();

  await prisma.user.update({
    where: { id: userId },
    data: { inviteToken, inviteTokenExpiresAt: inviteExpiresAt() },
  });

  revalidatePath("/staff/team");

  const inviteUrl = await buildInviteUrl(inviteToken);
  const qrSvg = await generateQrSvg(inviteUrl);

  return { inviteUrl, qrSvg };
}

export async function deleteStaffAccount(formData: FormData) {
  const session = await requireStaff();
  const userId = formData.get("userId") as string;

  if (userId === session.user.id) {
    throw new Error("Impossible de supprimer son propre compte.");
  }

  const staffCount = await prisma.user.count({ where: { role: "STAFF" } });
  if (staffCount <= 1) {
    throw new Error("Impossible de supprimer le dernier compte staff.");
  }

  await prisma.user.deleteMany({ where: { id: userId, role: "STAFF" } });

  revalidatePath("/staff/team");
}
