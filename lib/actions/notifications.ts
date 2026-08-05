"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";

export async function markAllNotificationsRead() {
  const { clientId } = await requireClient();

  await prisma.notification.updateMany({
    where: { clientId, read: false },
    data: { read: true },
  });

  revalidatePath("/client", "layout");
}
