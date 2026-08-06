"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { vehicleSchema, clientSchema } from "@/lib/validation";
import { saveVehiclePhoto, deleteVehiclePhotoFile } from "@/lib/storage";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { generateInviteToken, inviteExpiresAt, buildInviteUrl, generateQrSvg } from "@/lib/invite";

export type VehicleActionState = {
  error?: string;
  success?: {
    vehicleId: string;
    newClient?: { email: string; inviteUrl: string; qrSvg: string };
  };
};

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
    status: formData.get("status"),
    depositDate: formData.get("depositDate"),
    listingUrls: extractListingUrls(formData),
  });
}

async function savePhotos(vehicleId: string, formData: FormData) {
  const files = formData.getAll("photos") as File[];
  const validFiles = files.filter((f) => f instanceof File && f.size > 0);
  if (validFiles.length === 0) return;

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
}

/** Crée le client (+ compte de connexion) à la volée depuis le formulaire véhicule. */
async function createClientInline(agencyId: string, formData: FormData) {
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
  const { agencyId } = await requireStaff();

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
    const result = await createClientInline(agencyId, formData);
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
      where: { id: parsed.data.clientId, agencyId },
    });
    if (!client) {
      return { error: "Client introuvable." };
    }
    clientId = client.id;
  }

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
      status: parsed.data.status,
      depositDate: new Date(parsed.data.depositDate),
      listingUrls: { create: parsed.data.listingUrls },
    },
  });

  await savePhotos(vehicle.id, formData);

  revalidatePath("/staff/vehicles");
  revalidatePath("/staff/clients");
  revalidatePath(`/staff/clients/${clientId}`);

  if (newClientCredentials) {
    // On ne redirige pas immédiatement : les identifiants générés doivent
    // être affichés une fois au staff avant de continuer vers la fiche.
    return { success: { vehicleId: vehicle.id, newClient: newClientCredentials } };
  }

  redirect(`/staff/vehicles/${vehicle.id}`);
}

export async function updateVehicle(
  vehicleId: string,
  _prevState: VehicleActionState,
  formData: FormData,
): Promise<VehicleActionState> {
  const { agencyId } = await requireStaff();

  const existingVehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, agencyId },
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
    where: { id: parsed.data.clientId, agencyId },
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

  await prisma.$transaction([
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
        status: parsed.data.status,
        depositDate: new Date(parsed.data.depositDate),
        listingUrls: { create: parsed.data.listingUrls },
      },
    }),
  ]);

  await savePhotos(vehicleId, formData);

  revalidatePath("/staff/vehicles");
  revalidatePath(`/staff/vehicles/${vehicleId}`);
  redirect(`/staff/vehicles/${vehicleId}`);
}

export async function deletePhoto(formData: FormData) {
  const { agencyId } = await requireStaff();
  const photoId = formData.get("photoId") as string;
  const vehicleId = formData.get("vehicleId") as string;

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, vehicle: { agencyId } },
  });
  if (photo) {
    await prisma.photo.delete({ where: { id: photoId } });
    await deleteVehiclePhotoFile(photo.url);
  }

  revalidatePath(`/staff/vehicles/${vehicleId}`);
  revalidatePath(`/staff/vehicles/${vehicleId}/edit`);
}
