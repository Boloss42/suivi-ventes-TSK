import { sendEmail, type SendEmailResult } from "@/lib/email";

/**
 * Email de réinitialisation de mot de passe. Réutilise le mécanisme de jeton
 * d'invitation (`inviteToken` + page `/activate/[token]`, commune aux comptes
 * client et agent) : le lien pointe donc vers la même page qui permet de
 * (re)définir un mot de passe. Template HTML sobre, compatible clients mail
 * (styles inline, tableaux), aux couleurs de la marque (accent rose #ec028c).
 */

const BRAND = "MyVitrine";
const ACCENT = "#ec028c";

type PasswordResetEmailParams = {
  // Facultatif : les comptes agents peuvent ne pas avoir de prénom.
  firstName?: string | null;
  resetUrl: string;
};

export function buildPasswordResetEmail(params: PasswordResetEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, resetUrl } = params;
  const subject = `${BRAND} — réinitialisation de votre mot de passe`;
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const intro = `Vous avez demandé à réinitialiser le mot de passe de votre compte ${BRAND}. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.`;

  const text = [
    greeting,
    ``,
    intro,
    ``,
    `Choisissez un nouveau mot de passe ici :`,
    resetUrl,
    ``,
    `Ce lien est valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.`,
    ``,
    `L'équipe ${BRAND}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:#12132a;padding:24px 32px;">
                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">My<span style="color:${ACCENT};">Vitrine</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;">${escapeHtml(greeting)}</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#33344a;">
                  ${escapeHtml(intro)}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:10px;background:${ACCENT};">
                      <a href="${escapeAttr(resetUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Réinitialiser mon mot de passe</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;color:#7a7b90;">
                  Ce lien est valable 7 jours. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                </p>
                <p style="margin:0 0 24px;font-size:13px;word-break:break-all;">
                  <a href="${escapeAttr(resetUrl)}" style="color:${ACCENT};">${escapeHtml(resetUrl)}</a>
                </p>
                <p style="margin:0;font-size:14px;color:#33344a;">L'équipe ${BRAND}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#fafafc;border-top:1px solid #ececf1;">
                <p style="margin:0;font-size:12px;color:#9a9bad;">Vous recevez cet email car une réinitialisation de mot de passe a été demandée pour votre compte ${BRAND}. Si ce n'est pas vous, ignorez ce message.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

/** Construit puis envoie l'email de réinitialisation. Ne lève jamais d'exception. */
export async function sendPasswordResetEmail(
  to: string,
  params: PasswordResetEmailParams,
): Promise<SendEmailResult> {
  const { subject, html, text } = buildPasswordResetEmail(params);
  return sendEmail({ to, subject, html, text });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
