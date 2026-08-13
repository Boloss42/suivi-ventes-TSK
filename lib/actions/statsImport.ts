"use server";

import { requireStaff } from "@/lib/session";
import { extractLbcStats, type LbcMediaType } from "@/lib/lbcExtract";

/**
 * Import d'un relevé à partir d'une capture du tableau de bord LeBonCoin :
 * l'agent envoie l'image, on en extrait les chiffres (Claude vision) et on les
 * renvoie mappés sur les champs du relevé, pour pré-remplir le formulaire.
 * Aucune écriture en base ici — l'agent vérifie puis enregistre normalement.
 */

export type ImportedStatValues = {
  views?: number; // Apparitions
  detailViews?: number; // Vues
  favorites?: number; // Favoris
  contacts?: number; // Messages
  calls?: number; // Intentions d'appel
};

export type ImportStatsState = {
  error?: string;
  values?: ImportedStatValues;
  // Champs non présents sur LeBonCoin (Visites, Offres) : restent à saisir.
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo
const ALLOWED: Record<string, LbcMediaType> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

export async function importStatsFromScreenshot(
  _prevState: ImportStatsState,
  formData: FormData,
): Promise<ImportStatsState> {
  // Isolation : réservé au staff connecté.
  await requireStaff();

  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Aucune image fournie." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image trop lourde (8 Mo maximum)." };
  }
  const mediaType = ALLOWED[file.type];
  if (!mediaType) {
    return { error: "Format non supporté. Utilisez une image JPEG, PNG ou WebP." };
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const result = await extractLbcStats(base64, mediaType);
  if (!result.ok) {
    return { error: result.error };
  }

  const d = result.data;
  const values: ImportedStatValues = {};
  if (d.apparitions != null) values.views = d.apparitions;
  if (d.vues != null) values.detailViews = d.vues;
  if (d.favoris != null) values.favorites = d.favoris;
  if (d.messages != null) values.contacts = d.messages;
  if (d.intentionsAppel != null) values.calls = d.intentionsAppel;

  if (Object.keys(values).length === 0) {
    return { error: "Aucun chiffre reconnu sur la capture. Vérifiez qu'il s'agit bien du tableau d'activité LeBonCoin." };
  }

  return { values };
}
