import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads", "vehicles");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Stockage des photos sur disque local (suffisant pour un déploiement simple
 * à un seul serveur). À remplacer par un stockage objet (S3, Cloudinary...)
 * si l'app est déployée sur une infra multi-instance/serverless.
 */
export async function saveVehiclePhoto(vehicleId: string, file: File) {
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new Error("Format d'image non supporté (JPEG, PNG ou WebP uniquement).");
  }

  const dir = path.join(UPLOADS_ROOT, vehicleId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/vehicles/${vehicleId}/${filename}`;
}

export async function deleteVehiclePhotoFile(url: string) {
  if (!url.startsWith("/uploads/vehicles/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  await unlink(filePath).catch(() => {});
}
