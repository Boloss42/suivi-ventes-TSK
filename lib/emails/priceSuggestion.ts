import { sendEmail, type SendEmailResult } from "@/lib/email";

/**
 * Email envoyé au client quand son conseiller lui recommande de baisser le
 * prix net vendeur de son véhicule pour accélérer la vente.
 */

const BRAND = "MyVitrine";
const ACCENT = "#ec028c";

type PriceSuggestionParams = {
  firstName: string;
  vehicleLabel: string;
  currentPrice: string;
  suggestedPrice: string;
  message?: string | null;
  link: string;
};

export function buildPriceSuggestionEmail(params: PriceSuggestionParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, vehicleLabel, currentPrice, suggestedPrice, message, link } = params;
  const subject = `${BRAND} — recommandation de prix pour votre ${vehicleLabel}`;

  const text = [
    `Bonjour ${firstName},`,
    ``,
    `Votre conseiller vous recommande de baisser le prix de votre ${vehicleLabel} pour accélérer la vente :`,
    `Prix actuel : ${currentPrice}`,
    `Prix recommandé : ${suggestedPrice}`,
    ...(message ? [``, `Message de votre conseiller : « ${message} »`] : []),
    ``,
    `Consultez votre espace pour en discuter ou ajuster le prix : ${link}`,
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
                <p style="margin:0 0 16px;font-size:16px;">Bonjour ${escapeHtml(firstName)},</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#33344a;">
                  Votre conseiller vous recommande de baisser le prix de votre
                  <strong>${escapeHtml(vehicleLabel)}</strong> pour accélérer la vente.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 14px;border:1px solid #ececf1;border-radius:8px 0 0 8px;font-size:13px;color:#7a7b90;">Prix actuel<br><span style="font-size:16px;color:#33344a;">${escapeHtml(currentPrice)}</span></td>
                    <td style="padding:10px 14px;border:1px solid ${ACCENT};border-radius:0 8px 8px 0;font-size:13px;color:${ACCENT};">Prix recommandé<br><span style="font-size:16px;font-weight:700;color:${ACCENT};">${escapeHtml(suggestedPrice)}</span></td>
                  </tr>
                </table>
                ${message ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#33344a;background:#fafafc;border-left:3px solid ${ACCENT};padding:10px 14px;">« ${escapeHtml(message)} »</p>` : ""}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                  <tr>
                    <td style="border-radius:10px;background:${ACCENT};">
                      <a href="${escapeAttr(link)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Voir mon véhicule</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#fafafc;border-top:1px solid #ececf1;">
                <p style="margin:0;font-size:12px;color:#9a9bad;">Vous recevez cet email car votre conseiller ${BRAND} a émis une recommandation sur votre véhicule.</p>
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

/** Construit puis envoie l'email de recommandation de prix. Ne lève jamais d'exception. */
export async function sendPriceSuggestionEmail(
  to: string,
  params: PriceSuggestionParams,
): Promise<SendEmailResult> {
  const { subject, html, text } = buildPriceSuggestionEmail(params);
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
