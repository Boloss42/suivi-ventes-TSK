"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { activateSchema } from "@/lib/validation";
import { signIn } from "@/auth";

export type ActivateState = { error?: string };

export async function activateAccount(
  token: string,
  _prevState: ActivateState,
  formData: FormData,
): Promise<ActivateState> {
  const parsed = activateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!user || !user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
    return {
      error: "Ce lien n'est plus valide. Contactez MyVitrine pour en recevoir un nouveau.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, inviteToken: null, inviteTokenExpiresAt: null },
  });

  try {
    await signIn("credentials", {
      email: user.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Le compte est activé même si la connexion automatique échoue :
      // le client peut toujours se connecter manuellement.
      redirect("/login");
    }
    throw error;
  }

  return {};
}
