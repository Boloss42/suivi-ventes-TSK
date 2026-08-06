"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { staffProfileSchema } from "@/lib/validation";

export type ProfileState = { error?: string; success?: boolean };

export async function updateStaffProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { userId } = await requireStaff();

  const parsed = staffProfileSchema.safeParse({
    firstName: formData.get("firstName") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: parsed.data.firstName || null,
      phone: parsed.data.phone || null,
    },
  });

  revalidatePath("/staff/profile");

  return { success: true };
}
