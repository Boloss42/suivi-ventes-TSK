/**
 * Migration des anciennes photos (stockage disque local `/uploads/...`) vers
 * Cloudflare R2. À lancer UNE fois, là où les fichiers existent encore.
 *
 *   node --env-file=.env --import tsx scripts/migrate-photos-to-r2.mts          # simulation (dry-run)
 *   node --env-file=.env --import tsx scripts/migrate-photos-to-r2.mts --apply  # applique réellement
 *
 * ⚠️ Sur Railway le disque est éphémère : les fichiers `/uploads/...` de la prod
 * sont probablement déjà perdus. Ce script migre ce qui existe encore et liste
 * clairement les fichiers introuvables (impossibles à récupérer).
 */
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable ${name} manquante.`);
  return v;
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
  },
});
const bucket = env("R2_BUCKET_NAME");
const publicBase = env("R2_PUBLIC_URL").replace(/\/$/, "");

const photos = await prisma.photo.findMany({ select: { id: true, url: true, vehicleId: true } });
const toMigrate = photos.filter((p) => p.url.startsWith("/uploads/"));

console.log(`Photos totales : ${photos.length} | à migrer (locales) : ${toMigrate.length}`);
console.log(APPLY ? "Mode : APPLIQUER\n" : "Mode : SIMULATION (ajouter --apply pour appliquer)\n");

let migrated = 0;
let missing = 0;

for (const photo of toMigrate) {
  const localPath = path.join(process.cwd(), "public", photo.url);
  if (!existsSync(localPath)) {
    missing++;
    console.log(`  ✗ fichier introuvable (perdu) : ${photo.url}`);
    continue;
  }

  const ext = path.extname(photo.url).slice(1).toLowerCase();
  const contentType = EXT_TO_MIME[ext] ?? "application/octet-stream";
  const key = `vehicles/${photo.vehicleId}/${randomUUID()}.${ext}`;
  const newUrl = `${publicBase}/${key}`;

  if (APPLY) {
    const body = await readFile(localPath);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    await prisma.photo.update({ where: { id: photo.id }, data: { url: newUrl } });
    console.log(`  ✓ migré : ${photo.url} -> ${newUrl}`);
  } else {
    console.log(`  → migrerait : ${photo.url} -> ${newUrl}`);
  }
  migrated++;
}

console.log(`\nBilan : ${migrated} ${APPLY ? "migrées" : "à migrer"}, ${missing} introuvables.`);
await prisma.$disconnect();
