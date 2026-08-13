import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import BulkStatForm from "@/components/BulkStatForm";
import { currentWeekStart } from "@/lib/week";

export default async function BulkStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicles?: string }>;
}) {
  const { agencyId, userId } = await requireStaff();
  const { vehicles: preselectParam } = await searchParams;

  // Seuls les véhicules en vente ont des relevés à suivre.
  const vehicles = await prisma.vehicle.findMany({
    where: { agencyId, client: { assignedStaffId: userId }, status: "EN_VENTE" },
    orderBy: [{ make: "asc" }, { model: "asc" }],
    select: {
      id: true,
      make: true,
      model: true,
      reference: true,
      client: { select: { firstName: true, lastName: true } },
    },
  });

  const options = vehicles.map((v) => ({
    id: v.id,
    make: v.make,
    model: v.model,
    reference: v.reference,
    clientName: `${v.client.firstName} ${v.client.lastName}`,
  }));

  // Pré-sélection éventuelle (bouton « Saisir tous les relevés » du tableau de
  // bord) : on ne garde que les identifiants réellement autorisés pour l'agent.
  const allowedIds = new Set(options.map((o) => o.id));
  const preselectedIds = (preselectParam?.split(",") ?? []).filter((id) =>
    allowedIds.has(id),
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Relevé en masse</h1>
        <Link href="/staff/vehicles" className="text-sm font-medium text-ink-500 hover:underline">
          Retour aux véhicules
        </Link>
      </div>

      {options.length === 0 ? (
        <div className="max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Aucun véhicule en vente à relever pour le moment.
        </div>
      ) : (
        <>
          <p className="mb-4 max-w-2xl text-sm text-ink-500">
            Cochez les véhicules concernés, choisissez la semaine, puis renseignez
            les chiffres — à la main ou en important une capture LeBonCoin par ligne.
            Jusqu&apos;à 100 relevés par lot.
          </p>
          <BulkStatForm
            vehicles={options}
            defaultWeekStart={currentWeekStart().toISOString().slice(0, 10)}
            preselectedIds={preselectedIds}
          />
        </>
      )}
    </div>
  );
}
