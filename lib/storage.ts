import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Stockage des photos de véhicules sur un stockage objet compatible S3
 * (Cloudflare R2). Persistant (contrairement au disque local de Railway qui
 * est éphémère). Les objets sont rangés sous une clé non devinable
 * `vehicles/<vehicleId>/<uuid>.<ext>` et servis publiquement via le
 * sous-domaine R2 public (R2_PUBLIC_URL). Aucune donnée client sensible n'est
 * exposée : seule la photo de l'annonce, à une URL non énumérable.
 */

function requireEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(
      `Variable d'environnement ${name} manquante : le stockage des photos (R2) n'est pas configuré.`,
    );
  }
  // Tolère les erreurs de copier-coller fréquentes qui rendaient l'endpoint R2
  // invalide (ex. R2_ACCOUNT_ID=<votre-id> → URL « https://<...>.r2… ») :
  // on retire les espaces autour et d'éventuels chevrons « <…> » de placeholder.
  const value = raw.trim().replace(/^<([\s\S]*)>$/, "$1").trim();
  if (!value) {
    throw new Error(
      `Variable d'environnement ${name} vide : le stockage des photos (R2) n'est pas configuré.`,
    );
  }
  return value;
}

// Client S3 créé paresseusement (au premier upload/suppression) pour ne pas
// échouer au build si les variables ne sont pas présentes.
let cachedClient: S3Client | null = null;
function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const accountId = requireEnv("R2_ACCOUNT_ID");
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return cachedClient;
}

function publicBaseUrl(): string {
  return requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
}

export async function saveVehiclePhoto(vehicleId: string, file: File): Promise<string> {
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new Error("Format d'image non supporté (JPEG, PNG ou WebP uniquement).");
  }

  const key = `vehicles/${vehicleId}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await getClient().send(
    new PutObjectCommand({
      Bucket: requireEnv("R2_BUCKET_NAME"),
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  return `${publicBaseUrl()}/${key}`;
}

/**
 * Suppression best-effort d'une photo sur R2 : ne doit JAMAIS faire échouer
 * l'appelant (suppression d'un véhicule ou d'une photo déjà actée en base).
 * Toute la fonction est protégée, y compris la construction de l'URL/du
 * client (qui peuvent lever si une variable R2 est mal configurée) — avant,
 * seul l'appel S3 final était protégé, ce qui laissait une suppression de
 * véhicule échouer silencieusement (DB déjà supprimée, mais l'exception
 * empêchait revalidatePath : la fiche restait affichée comme si de rien).
 */
export async function deleteVehiclePhotoFile(url: string): Promise<void> {
  try {
    const base = `${publicBaseUrl()}/`;
    // On ne supprime que les objets réellement stockés sur notre bucket R2.
    // Les anciennes URLs locales (/uploads/...) sont ignorées (fichiers déjà
    // perdus sur le FS éphémère) pour ne pas bloquer une suppression de véhicule.
    if (!url.startsWith(base)) return;

    const key = url.slice(base.length);
    if (!key) return;

    await getClient().send(new DeleteObjectCommand({ Bucket: requireEnv("R2_BUCKET_NAME"), Key: key }));
  } catch (error) {
    console.error("[deleteVehiclePhotoFile] échec de la suppression R2 (ignoré) :", error);
  }
}
