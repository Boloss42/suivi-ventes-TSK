"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { agencySchema, staffAccountSchema } from "@/lib/validation";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { generateInviteToken, inviteExpiresAt, buildInviteUrl, generateQrSvg } from "@/lib/invite";

export type AgencyActionState = { error?: string };

export async function createAgency(
  _prevState: AgencyActionState,
  formData: FormData,
): Promise<AgencyActionState> {
  await requireSuperAdmin();

  const parsed = agencySchema.safeParse({
    name: formData.get("name"),
    maxStaffAccounts: formData.get("maxStaffAccounts"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const agency = await prisma.agency.create({
    data: { name: parsed.data.name, maxStaffAccounts: parsed.data.maxStaffAccounts },
  });

  revalidatePath("/admin/agencies");
  redirect(`/admin/agencies/${agency.id}`);
}

export type UpdateAgencyState = { error?: string; success?: boolean };

export async function updateAgency(
  agencyId: string,
  _prevState: UpdateAgencyState,
  formData: FormData,
): Promise<UpdateAgencyState> {
  await requireSuperAdmin();

  const parsed = agencySchema.safeParse({
    name: formData.get("name"),
    maxStaffAccounts: formData.get("maxStaffAccounts"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  await prisma.agency.update({
    where: { id: agencyId },
    data: { name: parsed.data.name, maxStaffAccounts: parsed.data.maxStaffAccounts },
  });

  revalidatePath(`/admin/agencies/${agencyId}`);
  revalidatePath("/admin/agencies");

  return { success: true };
}

export type AgencyStaffState = {
  error?: string;
  success?: { email: string; inviteUrl: string; qrSvg: string };
};

export async function createAgencyStaffAccount(
  agencyId: string,
  _prevState: AgencyStaffState,
  formData: FormData,
): Promise<AgencyStaffState> {
  await requireSuperAdmin();

  const parsed = staffAccountSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) {
    return { error: "Agence introuvable." };
  }

  const staffCount = await prisma.user.count({ where: { agencyId, role: "STAFF" } });
  if (staffCount >= agency.maxStaffAccounts) {
    return {
      error: `Quota atteint (${staffCount}/${agency.maxStaffAccounts}). Augmentez le quota de l'agence pour ajouter un agent.`,
    };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const placeholderHash = await hashPassword(generateTempPassword());
  const inviteToken = generateInviteToken();

  await prisma.user.create({
    data: {
      email,
      passwordHash: placeholderHash,
      role: "STAFF",
      agencyId,
      inviteToken,
      inviteTokenExpiresAt: inviteExpiresAt(),
    },
  });

  revalidatePath(`/admin/agencies/${agencyId}`);

  const inviteUrl = await buildInviteUrl(inviteToken);
  const qrSvg = await generateQrSvg(inviteUrl);

  return { success: { email, inviteUrl, qrSvg } };
}

export type AgencyStaffInviteLinkState = { error?: string; inviteUrl?: string; qrSvg?: string };

export async function regenerateAgencyStaffInviteLink(
  agencyId: string,
  _prevState: AgencyStaffInviteLinkState,
  formData: FormData,
): Promise<AgencyStaffInviteLinkState> {
  await requireSuperAdmin();
  const userId = formData.get("userId") as string;

  const user = await prisma.user.findFirst({ where: { id: userId, agencyId, role: "STAFF" } });
  if (!user) {
    return { error: "Compte introuvable." };
  }

  const inviteToken = generateInviteToken();

  await prisma.user.update({
    where: { id: userId },
    data: { inviteToken, inviteTokenExpiresAt: inviteExpiresAt() },
  });

  revalidatePath(`/admin/agencies/${agencyId}`);

  const inviteUrl = await buildInviteUrl(inviteToken);
  const qrSvg = await generateQrSvg(inviteUrl);

  return { inviteUrl, qrSvg };
}

export async function deleteAgencyStaffAccount(agencyId: string, formData: FormData) {
  await requireSuperAdmin();
  const userId = formData.get("userId") as string;

  await prisma.user.deleteMany({ where: { id: userId, agencyId, role: "STAFF" } });

  revalidatePath(`/admin/agencies/${agencyId}`);
}

export type ReassignClientState = { error?: string };

/** Attribue (ou réattribue) un client à un agent de la même agence. */
export async function reassignClient(
  agencyId: string,
  _prevState: ReassignClientState,
  formData: FormData,
): Promise<ReassignClientState> {
  await requireSuperAdmin();
  const clientId = formData.get("clientId") as string;
  const assignedStaffId = formData.get("assignedStaffId") as string;

  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId } });
  if (!client) {
    return { error: "Client introuvable." };
  }

  const staff = await prisma.user.findFirst({
    where: { id: assignedStaffId, agencyId, role: "STAFF" },
  });
  if (!staff) {
    return { error: "Agent introuvable." };
  }

  await prisma.client.update({ where: { id: clientId }, data: { assignedStaffId } });

  revalidatePath(`/admin/agencies/${agencyId}`);

  return {};
}
