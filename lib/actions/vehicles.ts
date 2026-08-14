"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { vehicleSchema, clientSchema, bulkVehiclesSchema } from "@/lib/validation";
import { saveVehiclePhoto, deleteVehiclePhotoFile } from "@/lib/storage";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { generateInviteToken, inviteExpiresAt, buildInviteUrl, generateQrSvg } from "@/lib/invite";

export type VehicleActionState = {
  error?: string;
  success?: {
    vehicleId: string;
    newClient?: { email: string; inviteUrl: string; qrSvg: string };
    // Message si le véhicule est bien enregistré mais que les photos ont échoué.
    photoError?: string;
  };
};

// Taille max acceptée par photo (cohérent avec serverActions.bodySizeLimit
// dans next.config.ts, qui borne la requête entière).
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const PHOTO_STORAGE_ERROR =
  "Les photos n'ont pas pu être enregistrées : le stockage est momentanément indisponible. Le véhicule est bien enregistré — réessayez d'ajouter les photos depuis « Modifier ».";

function extractListingUrls(formData: FormData) {
  const labels = formData.getAll("listingLabel") as string[];
  const urls = formData.getAll("listingUrl") as string[];
  return labels
    .map((label, i) => ({ label: label.trim(), url: (urls[i] ?? "").trim() }))
    .filter((entry) => entry.label && entry.url);
}

function parseVehicleForm(formData: FormData) {
  return vehicleSchema.safeParse({
    clientId: formData.get("clientId") || undefined,
    make: formData.get("make"),
    model: formData.get("model"),
    year: formData.get("year"),
    mileage: formData.get("mileage"),
    fuelType: formData.get("fuelType"),
    reference: formData.get("reference"),
    price: formData.get("price"),
    advisedPrice: formData.get("advisedPrice") ?? "",
    status: formData.get("status"),
    depositDate: formData.get("depositDate"),
    listingUrls: extractListingUrls(formData),
  });
}

/**
 * Enregistre les photos jointes. Renvoie un message d'erreur à afficher en cas
 * d'échec du stockage, ou `null` si tout s'est bien passé (ou aucune photo).
 *
 * Robustesse : un échec R2 (variable manquante, clé invalide, réseau) ne doit
 * plus faire planter toute la page (« Application error »). On journalise la
 * cause réelle (visible dans les logs Railway) et on remonte un message propre ;
 * le véhicule, lui, reste enregistré.
 */
async function savePhotos(vehicleId: string, formData: FormData): Promise<string | null> {
  const files = formData.getAll("photos") as File[];
  const validFiles = files.filter((f) => f instanceof File && f.size > 0);
  if (validFiles.length === 0) return null;

  const tooBig = validFiles.find((f) => f.size > MAX_PHOTO_BYTES);
  if (tooBig) {
    return `La photo « ${tooBig.name || "sans nom"} » dépasse 15 Mo. Réduisez-la puis réessayez.`;
  }

  try {
    // Écrit les fichiers en parallèle et ne fait que 2 requêtes DB au total
    // (au lieu d'un count + create par photo, très coûteux en latence réseau
    // vers une base distante comme Neon).
    const startOrder = await prisma.photo.count({ where: { vehicleId } });
    const urls = await Promise.all(
      validFiles.map((file) => saveVehiclePhoto(vehicleId, file)),
    );

    await prisma.photo.createMany({
      data: urls.map((url, i) => ({ vehicleId, url, order: startOrder + i })),
    });
    return null;
  } catch (error) {
    // Log explicite : permet de retrouver la cause exacte dans les logs Railway
    // (ex. « Variable d'environnement R2_… manquante », erreur S3 403…).
    console.error("[savePhotos] échec de l'enregistrement des photos (R2) :", error);
    return PHOTO_STORAGE_ERROR;
  }
}

/** Crée le client (+ compte de connexion) à la volée depuis le formulaire véhicule. */
async function createClientInline(agencyId: string, userId: string, formData: FormData) {
  const parsed = clientSchema.safeParse({
    firstName: formData.get("newClientFirstName"),
    lastName: formData.get("newClientLastName"),
    email: formData.get("newClientEmail"),
    phone: formData.get("newClientPhone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs client invalides." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email pour ce nouveau client." };
  }

  const placeholderHash = await hashPassword(generateTempPassword());
  const inviteToken = generateInviteToken();

  const client = await prisma.client.create({
    data: {
      agency: { connect: { id: agencyId } },
      assignedStaff: { connect: { id: userId } },
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      user: {
        create: {
          email,
          passwordHash: placeholderHash,
          role: "CLIENT" as const,
          inviteToken,
          inviteTokenExpiresAt: inviteExpiresAt(),
        },
      },
    },
  });

  const inviteUrl = await buildInviteUrl(inviteToken);
  const qrSvg = await generateQrSvg(inviteUrl);

  return { client, credentials: { email, inviteUrl, qrSvg } };
}

export async function createVehicle(
  _prevState: VehicleActionState,
  formData: FormData,
): Promise<VehicleActionState> {
  const { agencyId, userId } = await requireStaff();

  const parsed = parseVehicleForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const existingRef = await prisma.vehicle.findUnique({
    where: { agencyId_reference: { agencyId, reference: parsed.data.reference } },
  });
  if (existingRef) {
    return { error: "Cette immatriculation / référence est déjà utilisée." };
  }

  const clientMode = formData.get("clientMode") === "new" ? "new" : "existing";

  let clientId: string;
  let newClientCredentials: { email: string; inviteUrl: string; qrSvg: string } | undefined;

  if (clientMode === "new") {
    const result = await createClientInline(agencyId, userId, formData);
    if ("error" in result) {
      return { error: result.error };
    }
    clientId = result.client.id;
    newClientCredentials = result.credentials;
  } else {
    if (!parsed.data.clientId) {
      return { error: "Client requis." };
    }
    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, agencyId, assignedStaffId: userId },
    });
    if (!client) {
      return { error: "Client introuvable." };
    }
    clientId = client.id;
  }

  const advisedPrice =
    typeof parsed.data.advisedPrice === "number" ? parsed.data.advisedPrice : null;

  const vehicle = await prisma.vehicle.create({
    data: {
      agencyId,
      clientId,
      make: parsed.data.make,
      model: parsed.data.model,
      year: parsed.data.year,
      mileage: parsed.data.mileage,
      fuelType: parsed.data.fuelType,
      reference: parsed.data.reference,
      price: parsed.data.price,
      advisedPrice,
      status: parsed.data.status,
      depositDate: new Date(parsed.data.depositDate),
      listingUrls: { create: parsed.data.listingUrls },
      // Première entrée de l'historique de prix.
      priceChanges: { create: { price: parsed.data.price } },
    },
  });

  const photoError = await savePhotos(vehicle.id, formData);

  revalidatePath("/staff/vehicles");
  revalidatePath("/staff/clients");
  revalidatePath(`/staff/clients/${clientId}`);

  if (newClientCredentials) {
    // On ne redirige pas immédiatement : les identifiants générés doivent
    // être affichés une fois au staff avant de continuer vers la fiche.
    return {
      success: { vehicleId: vehicle.id, newClient: newClientCredentials, photoError: photoError ?? undefined },
    };
  }

  // Le véhicule est créé quoi qu'il arrive ; on signale l'échec éventuel des
  // photos via la fiche plutôt que par une page d'erreur.
  redirect(`/staff/vehicles/${vehicle.id}${photoError ? "?photoError=1" : ""}`);
}

export type BulkVehicleActionState = {
  error?: string;
  /** Erreurs rattachées à l'index de la ligne concernée (pour surlignage côté UI). */
  rowErrors?: { index: number; message: string }[];
  success?: { created: number };
};

/**
 * Ajout de plusieurs véhicules en une fois (formulaire multi-lignes staff).
 * Chaque ligne porte son propre client. Création atomique (tout ou rien) :
 * si une seule ligne est invalide, aucune n'est créée et les erreurs sont
 * renvoyées par index de ligne. Pas de photos ni de liens ici (ajoutés
 * ensuite par véhicule).
 */
export async function createVehiclesBulk(
  _prevState: BulkVehicleActionState,
  formData: FormData,
): Promise<BulkVehicleActionState> {
  const { agencyId, userId } = await requireStaff();

  const raw = formData.get("rows");
  if (typeof raw !== "string") {
    return { error: "Données du formulaire invalides." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: "Données du formulaire invalides." };
  }

  const parsed = bulkVehiclesSchema.safeParse(payload);
  if (!parsed.success) {
    const rowErrors = parsed.error.issues.map((issue) => ({
      index: typeof issue.path[0] === "number" ? issue.path[0] : -1,
      message: issue.message,
    }));
    return { error: "Certaines lignes sont incomplètes ou invalides.", rowErrors };
  }

  const rows = parsed.data;
  const rowErrors: { index: number; message: string }[] = [];

  // 1. Doublons de référence à l'intérieur du lot (comparaison tolérante).
  const seen = new Map<string, number>();
  rows.forEach((row, i) => {
    const key = row.reference.trim().toLowerCase();
    if (seen.has(key)) {
      rowErrors.push({
        index: i,
        message: `Référence « ${row.reference} » en double dans le lot.`,
      });
    } else {
      seen.set(key, i);
    }
  });

  // 2. Isolation : chaque client doit appartenir à cette agence ET à cet agent.
  const clientIds = [...new Set(rows.map((r) => r.clientId))];
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds }, agencyId, assignedStaffId: userId },
    select: { id: true },
  });
  const allowedClientIds = new Set(clients.map((c) => c.id));
  rows.forEach((row, i) => {
    if (!allowedClientIds.has(row.clientId)) {
      rowErrors.push({ index: i, message: "Client introuvable ou non autorisé." });
    }
  });

  // 3. Références déjà présentes en base pour cette agence.
  const existing = await prisma.vehicle.findMany({
    where: { agencyId, reference: { in: rows.map((r) => r.reference) } },
    select: { reference: true },
  });
  const existingRefs = new Set(existing.map((e) => e.reference));
  rows.forEach((row, i) => {
    if (existingRefs.has(row.reference)) {
      rowErrors.push({
        index: i,
        message: `Référence « ${row.reference} » déjà utilisée.`,
      });
    }
  });

  if (rowErrors.length > 0) {
    return { error: "Corrigez les lignes signalées puis réessayez.", rowErrors };
  }

  // Création atomique : tout ou rien.
  await prisma.$transaction(
    rows.map((row) =>
      prisma.vehicle.create({
        data: {
          agencyId,
          clientId: row.clientId,
          make: row.make,
          model: row.model,
          year: row.year,
          mileage: row.mileage,
          fuelType: row.fuelType,
          reference: row.reference,
          price: row.price,
          advisedPrice: typeof row.advisedPrice === "number" ? row.advisedPrice : null,
          status: row.status,
          depositDate: new Date(row.depositDate),
          priceChanges: { create: { price: row.price } },
        },
      }),
    ),
  );

  revalidatePath("/staff/vehicles");
  revalidatePath("/staff/clients");

  return { success: { created: rows.length } };
}

export async function updateVehicle(
  vehicleId: string,
  _prevState: VehicleActionState,
  formData: FormData,
): Promise<VehicleActionState> {
  const { agencyId, userId } = await requireStaff();

  const existingVehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, agencyId, client: { assignedStaffId: userId } },
  });
  if (!existingVehicle) {
    return { error: "Véhicule introuvable." };
  }

  const parsed = parseVehicleForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  if (!parsed.data.clientId) {
    return { error: "Client requis." };
  }
  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, agencyId, assignedStaffId: userId },
  });
  if (!client) {
    return { error: "Client introuvable." };
  }
  const clientId = client.id;

  const existingRef = await prisma.vehicle.findUnique({
    where: { agencyId_reference: { agencyId, reference: parsed.data.reference } },
  });
  if (existingRef && existingRef.id !== vehicleId) {
    return { error: "Cette immatriculation / référence est déjà utilisée." };
  }

  const advisedPrice =
    typeof parsed.data.advisedPrice === "number" ? parsed.data.advisedPrice : null;

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.listingUrl.deleteMany({ where: { vehicleId } }),
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        clientId,
        make: parsed.data.make,
        model: parsed.data.model,
        year: parsed.data.year,
        mileage: parsed.data.mileage,
        fuelType: parsed.data.fuelType,
        reference: parsed.data.reference,
        price: parsed.data.price,
        advisedPrice,
        status: parsed.data.status,
        depositDate: new Date(parsed.data.depositDate),
        listingUrls: { create: parsed.data.listingUrls },
      },
    }),
  ];

  // Historise le prix uniquement s'il a réellement changé.
  if (parsed.data.price !== existingVehicle.price) {
    ops.push(prisma.priceChange.create({ data: { vehicleId, price: parsed.data.price } }));
  }

  await prisma.$transaction(ops);

  const photoError = await savePhotos(vehicleId, formData);

  revalidatePath("/staff/vehicles");
  revalidatePath(`/staff/vehicles/${vehicleId}`);
  redirect(`/staff/vehicles/${vehicleId}${photoError ? "?photoError=1" : ""}`);
}

export async function deleteVehicle(formData: FormData) {
  const { agencyId, userId } = await requireStaff();
  const vehicleId = formData.get("vehicleId") as string;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, agencyId, client: { assignedStaffId: userId } },
    include: { photos: true },
  });
  if (!vehicle) return;

  await prisma.vehicle.delete({ where: { id: vehicleId } });

  await Promise.all(vehicle.photos.map((photo) => deleteVehiclePhotoFile(photo.url)));

  revalidatePath("/staff/vehicles");
  revalidatePath("/staff/dashboard");
  revalidatePath(`/staff/clients/${vehicle.clientId}`);
}

export async function deletePhoto(formData: FormData) {
  const { agencyId, userId } = await requireStaff();
  const photoId = formData.get("photoId") as string;
  const vehicleId = formData.get("vehicleId") as string;

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, vehicle: { agencyId, client: { assignedStaffId: userId } } },
  });
  if (photo) {
    await prisma.photo.delete({ where: { id: photoId } });
    await deleteVehiclePhotoFile(photo.url);
  }

  revalidatePath(`/staff/vehicles/${vehicleId}`);
  revalidatePath(`/staff/vehicles/${vehicleId}/edit`);
}
