"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { generateInviteToken, inviteExpiresAt, buildInviteUrl } from "@/lib/invite";
import { sendPasswordResetEmail } from "@/lib/emails/passwordReset";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Email ou mot de passe incorrect.";
        default:
          return "Une erreur est survenue, veuillez réessayer.";
      }
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export type ForgotPasswordState = { error?: string; sent?: boolean };

// Anti-abus léger : on ne renvoie pas d'email plus d'une fois par minute pour
// une même adresse (mémoire process — repli suffisant à cette échelle, pas une
// garantie stricte en multi-instances).
const RESET_THROTTLE_MS = 60 * 1000;
const lastResetByEmail = new Map<string, number>();

/**
 * Demande de réinitialisation de mot de passe (agent OU client). Réutilise le
 * mécanisme `inviteToken` + page `/activate/[token]`. Ne révèle jamais si un
 * compte existe (message générique) pour ne pas divulguer les emails inscrits.
 */
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Adresse email invalide." };
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Réponse générique dans tous les cas (compte inexistant, throttlé, envoyé).
  const generic: ForgotPasswordState = { sent: true };

  const now = Date.now();
  const last = lastResetByEmail.get(email);
  if (last && now - last < RESET_THROTTLE_MS) {
    return generic;
  }
  lastResetByEmail.set(email, now);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { client: { select: { firstName: true } } },
  });

  if (user) {
    const inviteToken = generateInviteToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { inviteToken, inviteTokenExpiresAt: inviteExpiresAt() },
    });
    const resetUrl = await buildInviteUrl(inviteToken);
    // Prénom : celui du client si compte client, sinon celui de l'agent (User).
    const firstName = user.client?.firstName ?? user.firstName;
    await sendPasswordResetEmail(email, { firstName, resetUrl });
  }

  return generic;
}
