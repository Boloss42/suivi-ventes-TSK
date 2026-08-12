"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { generateInviteToken, inviteExpiresAt, buildInviteUrl } from "@/lib/invite";
import { sendPasswordResetEmail } from "@/lib/emails/passwordReset";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

// Anti-force-brute du login (fenêtre glissante, mémoire process — voir
// lib/rateLimit.ts). Deux garde-fous complémentaires :
//  - par (IP, email) : borne les essais sur un compte donné depuis une source ;
//  - par IP seule : freine le balayage de nombreux emails depuis une même IP.
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 min
const LOGIN_PER_ACCOUNT = { limit: 5, windowMs: LOGIN_WINDOW_MS };
const LOGIN_PER_IP = { limit: 20, windowMs: LOGIN_WINDOW_MS };

function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop de tentatives de connexion. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

/** Première valeur exploitable de `x-forwarded-for`, sinon `x-real-ip`. */
function clientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const ip = clientIp(await headers());
  const accountKey = `login:${ip}:${email}`;
  const ipKey = `login-ip:${ip}`;

  // Blocage AVANT toute vérification d'identifiants si le seuil est atteint.
  const account = isRateLimited(accountKey, LOGIN_PER_ACCOUNT);
  if (account.blocked) return tooManyAttemptsMessage(account.retryAfterSeconds);
  const perIp = isRateLimited(ipKey, LOGIN_PER_IP);
  if (perIp.blocked) return tooManyAttemptsMessage(perIp.retryAfterSeconds);

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin": {
          // On ne compte que les ÉCHECS (la réussite lève une redirection et ne
          // passe pas ici) : un login réussi ne consomme pas le quota.
          recordAttempt(ipKey, LOGIN_PER_IP);
          const after = recordAttempt(accountKey, LOGIN_PER_ACCOUNT);
          if (after.blocked) return tooManyAttemptsMessage(after.retryAfterSeconds);
          return "Email ou mot de passe incorrect.";
        }
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
