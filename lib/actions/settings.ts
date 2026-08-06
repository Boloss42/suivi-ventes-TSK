"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const SETTINGS_ID = "settings";

const settingsSchema = z.object({
  googleReviewUrl: z.union([z.string().url("Lien invalide"), z.literal("")]),
});

export type SettingsState = { error?: string; success?: boolean };

export async function updateGoogleReviewUrl(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireStaff();

  const parsed = settingsSchema.safeParse({
    googleReviewUrl: formData.get("googleReviewUrl") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Lien invalide." };
  }

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, googleReviewUrl: parsed.data.googleReviewUrl || null },
    update: { googleReviewUrl: parsed.data.googleReviewUrl || null },
  });

  revalidatePath("/staff/reviews");

  return { success: true };
}
