import { sendEmail, type SendEmailResult } from "@/lib/email";

/**
 * Email d'activation envoyé au client pour qu'il définisse son mot de passe et
 * accède à son espace. Template HTML sobre (compatible clients mail : styles
 * inline, tableaux), aux couleurs de la marque (accent rose #ec028c).
 */

const BRAND = "MyVitrine";
const ACCENT = "#ec028c";

type ActivationEmailParams = {
  firstName: string;
  inviteUrl: string;
  advisorName?: string | null;
};

export function buildActivationEmail(params: ActivationEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, inviteUrl, advisorName } = params;
  const subject = `${BRAND} — activez votre espace de suivi`;
  const signature = advisorName ? `Votre conseiller, ${advisorName}` : `L'équipe ${BRAND}`;

  const text = [
    `Bonjour ${firstName},`,
    ``,
    `Votre espace ${BRAND} est prêt. Il vous permet de suivre en temps réel la mise en vente de votre véhicule.`,
    ``,
    `Activez votre compte et choisissez votre mot de passe ici :`,
    inviteUrl,
    ``,
    `Ce lien est valable 7 jours.`,
    ``,
    signature,
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
                <p style="margin:0 0 16px;font-size:16px;">Bonjour ${escapeHtml(firstName)},</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#33344a;">
                  Votre espace ${BRAND} est prêt. Il vous permet de suivre en temps réel
                  la mise en vente de votre véhicule : statistiques, prix conseillé et
                  échanges avec votre conseiller.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#33344a;">
                  Activez votre compte et choisissez votre mot de passe :
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:10px;background:${ACCENT};">
                      <a href="${escapeAttr(inviteUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Activer mon espace</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;color:#7a7b90;">
                  Ce lien est valable 7 jours. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                </p>
                <p style="margin:0 0 24px;font-size:13px;word-break:break-all;">
                  <a href="${escapeAttr(inviteUrl)}" style="color:${ACCENT};">${escapeHtml(inviteUrl)}</a>
                </p>
                <p style="margin:0;font-size:14px;color:#33344a;">${escapeHtml(signature)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#fafafc;border-top:1px solid #ececf1;">
                <p style="margin:0;font-size:12px;color:#9a9bad;">Vous recevez cet email car un espace de suivi a été créé pour vous sur ${BRAND}.</p>
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

/** Construit puis envoie l'email d'activation. Ne lève jamais d'exception. */
export async function sendActivationEmail(
  to: string,
  params: ActivationEmailParams,
): Promise<SendEmailResult> {
  const { subject, html, text } = buildActivationEmail(params);
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
