import { Resend } from "resend";

/**
 * Envoi d'emails transactionnels via Resend.
 *
 * Sûr par défaut : si `RESEND_API_KEY` ou `EMAIL_FROM` sont absents (ex. en
 * développement sans compte Resend), l'envoi est simplement ignoré (no-op) et
 * journalisé — aucune exception n'est levée. Les appelants ne doivent donc
 * jamais dépendre du succès de l'envoi pour leur logique métier (le lien
 * d'activation reste par exemple affiché à l'agent comme repli manuel).
 */

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getClient();
  const from = process.env.EMAIL_FROM;

  if (!client || !from) {
    console.warn(
      `[email] Envoi ignoré (RESEND_API_KEY ou EMAIL_FROM manquant) — sujet : « ${input.subject} »`,
    );
    return { ok: false, skipped: true };
  }

  try {
    const { data, error } = await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    if (error) {
      console.error("[email] Échec d'envoi Resend :", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] Exception lors de l'envoi :", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
