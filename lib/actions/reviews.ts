"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { generateQrSvg } from "@/lib/invite";

export type RequestReviewState = {
  error?: string;
  reviewUrl?: string;
  qrSvg?: string;
};

export async function requestReview(
  _prevState: RequestReviewState,
  formData: FormData,
): Promise<RequestReviewState> {
  const { agencyId } = await requireStaff();
  const clientId = formData.get("clientId") as string;

  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId } });
  if (!client) {
    return { error: "Client introuvable." };
  }

  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency?.googleReviewUrl) {
    return { error: "Configurez d'abord le lien d'avis Google ci-dessus." };
  }

  await prisma.$transaction([
    prisma.client.update({
      where: { id: clientId },
      data: { reviewRequestedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        clientId,
        type: "REVIEW",
        message: "Le service vous invite à laisser un avis Google. Merci pour votre confiance !",
      },
    }),
  ]);

  revalidatePath("/staff/reviews");
  revalidatePath("/client/dashboard", "layout");

  const qrSvg = await generateQrSvg(agency.googleReviewUrl);

  return { reviewUrl: agency.googleReviewUrl, qrSvg };
}
