"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { weeklyStatSchema, bulkWeeklyStatsSchema } from "@/lib/validation";
import { currentWeekStart } from "@/lib/week";

export type StatActionState = { error?: string };

export type BulkStatActionState = {
  error?: string;
  /** Erreurs rattachées au véhicule concerné (pour surlignage côté UI). */
  rowErrors?: { vehicleId: string; message: string }[];
  success?: { created: number };
};

function parseStatForm(formData: FormData) {
  return weeklyStatSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    weekStart: formData.get("weekStart"),
    views: formData.get("views"),
    detailViews: formData.get("detailViews"),
    contacts: formData.get("contacts"),
    calls: formData.get("calls"),
    favorites: formData.get("favorites"),
    visits: formData.get("visits"),
    offers: formData.get("offers"),
    note: formData.get("note") || undefined,
  });
}

export async function createWeeklyStat(
  _prevState: StatActionState,
  formData: FormData,
): Promise<StatActionState> {
  const { agencyId, userId } = await requireStaff();

  const parsed = parseStatForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: parsed.data.vehicleId, agencyId, client: { assignedStaffId: userId } },
    select: { clientId: true, make: true, model: true },
  });
  if (!vehicle) {
    return { error: "Véhicule introuvable." };
  }

  const weekStart = currentWeekStart(new Date(parsed.data.weekStart));

  try {
    await prisma.$transaction([
      prisma.weeklyStat.create({
        data: {
          vehicleId: parsed.data.vehicleId,
          weekStart,
          views: parsed.data.views,
          detailViews: parsed.data.detailViews,
          contacts: parsed.data.contacts,
          calls: parsed.data.calls,
          favorites: parsed.data.favorites,
          visits: parsed.data.visits,
          offers: parsed.data.offers,
          note: parsed.data.note,
        },
      }),
      prisma.notification.create({
        data: {
          clientId: vehicle.clientId,
          vehicleId: parsed.data.vehicleId,
          message: `De nouvelles statistiques sont disponibles pour votre ${vehicle.make} ${vehicle.model}.`,
        },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        error:
          "Un relevé existe déjà pour cette semaine. Modifiez-le plutôt depuis l'historique.",
      };
    }
    throw error;
  }

  revalidatePath(`/staff/vehicles/${parsed.data.vehicleId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath("/client/dashboard");
  revalidatePath(`/client/vehicles/${parsed.data.vehicleId}`);
  redirect(`/staff/vehicles/${parsed.data.vehicleId}`);
}

/**
 * Relevé en masse : un même relevé hebdo saisi pour plusieurs véhicules d'un
 * coup, avec une semaine commune. Best-effort par ligne — un véhicule qui a
 * déjà un relevé pour cette semaine (contrainte d'unicité) est signalé sans
 * bloquer les autres. Les lignes valides sont bien créées.
 */
export async function createWeeklyStatsBulk(
  _prevState: BulkStatActionState,
  formData: FormData,
): Promise<BulkStatActionState> {
  const { agencyId, userId } = await requireStaff();

  const weekStartRaw = formData.get("weekStart");
  if (typeof weekStartRaw !== "string" || weekStartRaw.trim() === "") {
    return { error: "Semaine requise." };
  }

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

  const parsed = bulkWeeklyStatsSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Certaines lignes sont invalides." };
  }

  const rows = parsed.data;
  const weekStart = currentWeekStart(new Date(weekStartRaw));

  // Isolation : ne garder que les véhicules de cette agence dont l'agent est
  // le commercial attribué.
  const vehicleIds = [...new Set(rows.map((r) => r.vehicleId))];
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds }, agencyId, client: { assignedStaffId: userId } },
    select: { id: true, clientId: true, make: true, model: true },
  });
  const byId = new Map(vehicles.map((v) => [v.id, v]));

  const rowErrors: { vehicleId: string; message: string }[] = [];
  const affectedVehicleIds: string[] = [];
  let created = 0;

  for (const row of rows) {
    const vehicle = byId.get(row.vehicleId);
    if (!vehicle) {
      rowErrors.push({ vehicleId: row.vehicleId, message: "Véhicule introuvable ou non autorisé." });
      continue;
    }
    try {
      await prisma.$transaction([
        prisma.weeklyStat.create({
          data: {
            vehicleId: row.vehicleId,
            weekStart,
            views: row.views,
            detailViews: row.detailViews,
            contacts: row.contacts,
            calls: row.calls,
            favorites: row.favorites,
            visits: row.visits,
            offers: row.offers,
            note: row.note,
          },
        }),
        prisma.notification.create({
          data: {
            clientId: vehicle.clientId,
            vehicleId: row.vehicleId,
            message: `De nouvelles statistiques sont disponibles pour votre ${vehicle.make} ${vehicle.model}.`,
          },
        }),
      ]);
      created += 1;
      affectedVehicleIds.push(row.vehicleId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        rowErrors.push({
          vehicleId: row.vehicleId,
          message: "Un relevé existe déjà pour cette semaine (modifiez-le depuis la fiche).",
        });
        continue;
      }
      throw error;
    }
  }

  if (created > 0) {
    revalidatePath("/staff/dashboard");
    revalidatePath("/client/dashboard");
    for (const id of affectedVehicleIds) {
      revalidatePath(`/staff/vehicles/${id}`);
      revalidatePath(`/client/vehicles/${id}`);
    }
  }

  return { success: { created }, ...(rowErrors.length ? { rowErrors } : {}) };
}

export async function updateWeeklyStat(
  statId: string,
  _prevState: StatActionState,
  formData: FormData,
): Promise<StatActionState> {
  const { agencyId, userId } = await requireStaff();

  const existingStat = await prisma.weeklyStat.findFirst({
    where: { id: statId, vehicle: { agencyId, client: { assignedStaffId: userId } } },
  });
  if (!existingStat) {
    return { error: "Relevé introuvable." };
  }

  const parsed = parseStatForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const weekStart = currentWeekStart(new Date(parsed.data.weekStart));

  try {
    await prisma.weeklyStat.update({
      where: { id: statId },
      data: {
        weekStart,
        views: parsed.data.views,
        detailViews: parsed.data.detailViews,
        contacts: parsed.data.contacts,
        calls: parsed.data.calls,
        favorites: parsed.data.favorites,
        visits: parsed.data.visits,
        offers: parsed.data.offers,
        note: parsed.data.note,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Un relevé existe déjà pour cette semaine." };
    }
    throw error;
  }

  revalidatePath(`/staff/vehicles/${parsed.data.vehicleId}`);
  revalidatePath("/staff/dashboard");
  redirect(`/staff/vehicles/${parsed.data.vehicleId}`);
}

export async function deleteWeeklyStat(statId: string) {
  const { agencyId, userId } = await requireStaff();

  // Isolation stricte : on ne supprime qu'un relevé d'un véhicule de sa propre
  // agence dont on est le commercial attribué.
  const stat = await prisma.weeklyStat.findFirst({
    where: { id: statId, vehicle: { agencyId, client: { assignedStaffId: userId } } },
    select: { id: true, vehicleId: true },
  });
  if (!stat) return;

  await prisma.weeklyStat.delete({ where: { id: stat.id } });

  revalidatePath(`/staff/vehicles/${stat.vehicleId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath("/client/dashboard");
  revalidatePath(`/client/vehicles/${stat.vehicleId}`);
  redirect(`/staff/vehicles/${stat.vehicleId}`);
}
