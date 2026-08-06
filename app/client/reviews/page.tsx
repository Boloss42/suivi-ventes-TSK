import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";
import { formatDate } from "@/lib/format";

export default async function ClientReviewsPage() {
  const { clientId } = await requireClient();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { reviewRequestedAt: true, agency: { select: { googleReviewUrl: true } } },
  });

  const reviewUrl = client?.agency.googleReviewUrl;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Avis Google</h1>

      <div className="rounded-lg border border-ink-100 bg-white p-6">
        {reviewUrl ? (
          <>
            <p className="mb-1 font-medium text-ink-900">
              Votre avis compte beaucoup pour nous !
            </p>
            <p className="mb-4 text-sm text-ink-500">
              {client?.reviewRequestedAt
                ? `L'équipe vous a invité à laisser un avis le ${formatDate(client.reviewRequestedAt)}. Un instant suffit :`
                : "Si vous êtes satisfait de notre service, un avis Google nous aide énormément :"}
            </p>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Laisser un avis Google
            </a>
          </>
        ) : (
          <p className="text-sm text-ink-400">
            Aucun lien d&apos;avis n&apos;est configuré pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
