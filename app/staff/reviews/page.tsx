import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import SettingsForm from "./SettingsForm";
import ClientReviewRow from "./ClientReviewRow";

export default async function ReviewsPage() {
  const { agencyId, userId } = await requireStaff();

  const [agency, clients] = await Promise.all([
    prisma.agency.findUnique({ where: { id: agencyId } }),
    prisma.client.findMany({
      where: { agencyId, assignedStaffId: userId },
      orderBy: { lastName: "asc" },
    }),
  ]);

  const hasReviewUrl = !!agency?.googleReviewUrl;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Avis Google</h1>

      <div className="mb-8 rounded-lg border border-ink-100 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink-800">
          Lien d&apos;avis Google de l&apos;agence
        </h2>
        <p className="mb-4 text-sm text-ink-500">
          À récupérer une seule fois depuis votre fiche Google Business Profile
          (« Demander des avis » → copier le lien), puis à laisser tel quel ici.
        </p>
        <SettingsForm currentUrl={agency?.googleReviewUrl ?? ""} />
      </div>

      <div className="rounded-lg border border-ink-100 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink-800">Demander un avis à un client</h2>
        <p className="mb-4 text-sm text-ink-500">
          Génère un lien et un QR code à transmettre au client pour qu&apos;il laisse
          un avis Google en un clic.
        </p>

        {!hasReviewUrl && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Renseignez d&apos;abord le lien d&apos;avis Google ci-dessus.
          </p>
        )}

        {clients.length === 0 ? (
          <p className="text-sm text-ink-400">Aucun client pour le moment.</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {clients.map((client) => (
              <ClientReviewRow
                key={client.id}
                clientId={client.id}
                name={`${client.firstName} ${client.lastName}`}
                requestedAt={client.reviewRequestedAt?.toISOString() ?? null}
                hasReviewUrl={hasReviewUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
