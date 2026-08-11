import { sendEmail, type SendEmailResult } from "@/lib/email";

/**
 * Email envoyé au client quand une offre d'achat est enregistrée pour son
 * véhicule. Ton positif (bonne nouvelle) et invitation à en discuter avec son
 * conseiller, qui gère la suite (contre-proposition, acceptation...).
 */

const BRAND = "MyVitrine";
const ACCENT = "#ec028c";

type OfferReceivedParams = {
  firstName: string;
  vehicleLabel: string;
  amount: string;
  buyerName?: string | null;
  advisorPhone?: string | null;
  link: string;
};

export function buildOfferReceivedEmail(params: OfferReceivedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, vehicleLabel, amount, buyerName, advisorPhone, link } = params;
  const subject = `${BRAND} — nouvelle offre pour votre ${vehicleLabel}`;
  const telHref = advisorPhone ? `tel:${advisorPhone.replace(/\s+/g, "")}` : null;
  const buyerLine = buyerName ? ` de la part de ${buyerName}` : "";

  const text = [
    `Bonjour ${firstName},`,
    ``,
    `Bonne nouvelle : une offre d'achat de ${amount}${buyerLine} vient d'être enregistrée pour votre ${vehicleLabel}.`,
    ``,
    `Votre conseiller va étudier cette offre avec vous (acceptation, contre-proposition...).`,
    ...(advisorPhone ? [``, `Pour en discuter : ${advisorPhone}`] : []),
    ``,
    `Voir le détail dans votre espace : ${link}`,
    ``,
    `L'équipe ${BRAND}`,
  ].join("\n");

  const contactButton = telHref
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                  <tr>
                    <td style="border-radius:10px;background:${ACCENT};">
                      <a href="${escapeAttr(telHref)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Contacter mon conseiller</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 4px;font-size:13px;color:#7a7b90;">Ou consultez votre espace : <a href="${escapeAttr(link)}" style="color:${ACCENT};">voir mon véhicule</a></p>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                  <tr>
                    <td style="border-radius:10px;background:${ACCENT};">
                      <a href="${escapeAttr(link)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Voir mon véhicule</a>
                    </td>
                  </tr>
                </table>`;

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
                <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#33344a;">
                  Bonne nouvelle : une offre d'achat vient d'être enregistrée pour votre
                  <strong>${escapeHtml(vehicleLabel)}</strong>${buyerName ? ` de la part de ${escapeHtml(buyerName)}` : ""}.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;">
                  <tr>
                    <td align="center" style="padding:16px;border:1px solid ${ACCENT};border-radius:10px;background:#fff5fb;">
                      <span style="font-size:12px;color:#7a7b90;text-transform:uppercase;letter-spacing:0.4px;">Offre reçue</span><br>
                      <span style="font-size:28px;font-weight:700;color:${ACCENT};">${escapeHtml(amount)}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#33344a;">
                  Votre conseiller va étudier cette offre avec vous (acceptation, contre-proposition...).
                  N'hésitez pas à le contacter pour en parler.
                </p>
                ${contactButton}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#fafafc;border-top:1px solid #ececf1;">
                <p style="margin:0;font-size:12px;color:#9a9bad;">Vous recevez cet email car votre conseiller ${BRAND} suit la vente de votre véhicule.</p>
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

/** Construit puis envoie l'email d'offre reçue. Ne lève jamais d'exception. */
export async function sendOfferReceivedEmail(
  to: string,
  params: OfferReceivedParams,
): Promise<SendEmailResult> {
  const { subject, html, text } = buildOfferReceivedEmail(params);
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
