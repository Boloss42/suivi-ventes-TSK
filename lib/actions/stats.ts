"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { weeklyStatSchema } from "@/lib/validation";
import { currentWeekStart } from "@/lib/week";

export type StatActionState = { error?: string };

function parseStatForm(formData: FormData) {
  return weeklyStatSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    weekStart: formData.get("weekStart"),
    views: formData.get("views"),
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
