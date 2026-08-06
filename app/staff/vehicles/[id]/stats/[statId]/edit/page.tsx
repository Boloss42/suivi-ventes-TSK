import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import StatForm from "@/components/StatForm";
import { updateWeeklyStat } from "@/lib/actions/stats";

export default async function EditStatPage({
  params,
}: {
  params: Promise<{ id: string; statId: string }>;
}) {
  const { agencyId, userId } = await requireStaff();
  const { id, statId } = await params;

  const [vehicle, stat] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { id, agencyId, client: { assignedStaffId: userId } },
    }),
    prisma.weeklyStat.findUnique({ where: { id: statId } }),
  ]);

  if (!vehicle || !stat || stat.vehicleId !== vehicle.id) notFound();

  const updateWithId = updateWeeklyStat.bind(null, stat.id);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink-900">
        Modifier le relevé — {vehicle.make} {vehicle.model}
      </h1>
      <p className="mb-6 text-sm text-ink-500">{vehicle.reference}</p>
      <StatForm
        action={updateWithId}
        submitLabel="Enregistrer les modifications"
        vehicleId={vehicle.id}
        defaultValues={{
          weekStart: stat.weekStart.toISOString().slice(0, 10),
          views: stat.views,
          contacts: stat.contacts,
          calls: stat.calls,
          favorites: stat.favorites,
          visits: stat.visits,
          offers: stat.offers,
          note: stat.note ?? "",
        }}
      />
    </div>
  );
}
