import Anthropic from "@anthropic-ai/sdk";

/**
 * Extraction des indicateurs d'une capture du tableau de bord d'activité
 * LeBonCoin (page « mon activité » d'un compte pro) via Claude (vision).
 *
 * Sûr par défaut : sans `ANTHROPIC_API_KEY`, l'extraction renvoie une erreur
 * explicite plutôt que de planter — la saisie manuelle du relevé reste possible.
 *
 * Modèle : Haiku (rapide et économique, largement suffisant pour lire des
 * chiffres sur une capture nette). L'appel ne coûte qu'une fraction de centime.
 */

const MODEL = "claude-haiku-4-5";

export type LbcMediaType = "image/jpeg" | "image/png" | "image/webp";

export type LbcExtraction = {
  apparitions: number | null;
  vues: number | null;
  favoris: number | null;
  messages: number | null;
  intentionsAppel: number | null;
};

export type LbcExtractResult =
  | { ok: true; data: LbcExtraction }
  | { ok: false; error: string };

const PROMPT = `Cette image est une capture du tableau de bord d'activité d'une annonce automobile sur LeBonCoin (page « mon activité » d'un compte pro).

Extrais les valeurs numériques affichées pour exactement ces cinq indicateurs :
- Apparitions
- Vues
- Favoris
- Messages
- Intentions d'appel

Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de la forme :
{"apparitions": <entier|null>, "vues": <entier|null>, "favoris": <entier|null>, "messages": <entier|null>, "intentions_appel": <entier|null>}

Règles :
- Entiers uniquement, en retirant les espaces des milliers (ex. « 15 165 » -> 15165).
- Si un indicateur n'est pas lisible sur l'image, mets null pour ce champ.
- N'invente aucune valeur.`;

/** Extrait le premier objet JSON présent dans un texte, ou null. */
function parseJsonObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Convertit une valeur extraite en entier >= 0, ou null. */
function toIntOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const n = parseInt(value.replace(/\s/g, ""), 10);
    return Number.isFinite(n) ? Math.max(0, n) : null;
  }
  return null;
}

export async function extractLbcStats(
  imageBase64: string,
  mediaType: LbcMediaType,
): Promise<LbcExtractResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: "Import automatique indisponible : clé API Anthropic manquante. Saisissez le relevé manuellement.",
    };
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const obj = parseJsonObject(text);
    if (!obj) {
      return { ok: false, error: "Lecture impossible : capture non reconnue. Réessayez avec une image plus nette." };
    }

    return {
      ok: true,
      data: {
        apparitions: toIntOrNull(obj.apparitions),
        vues: toIntOrNull(obj.vues),
        favoris: toIntOrNull(obj.favoris),
        messages: toIntOrNull(obj.messages),
        intentionsAppel: toIntOrNull(obj.intentions_appel),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Échec de l'extraction : ${err.message}` : "Échec de l'extraction.",
    };
  }
}
