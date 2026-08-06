import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import StatForm from "@/components/StatForm";
import { createWeeklyStat } from "@/lib/actions/stats";
import { currentWeekStart } from "@/lib/week";

export default async function NewStatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { agencyId, userId } = await requireStaff();
  const { id } = await params;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, agencyId, client: { assignedStaffId: userId } },
  });
  if (!vehicle) notFound();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink-900">
        Nouveau relevé — {vehicle.make} {vehicle.model}
      </h1>
      <p className="mb-6 text-sm text-ink-500">{vehicle.reference}</p>
      <StatForm
        action={createWeeklyStat}
        submitLabel="Enregistrer le relevé"
        vehicleId={vehicle.id}
        defaultValues={{
          weekStart: currentWeekStart().toISOString().slice(0, 10),
          views: 0,
          contacts: 0,
          calls: 0,
          favorites: 0,
          visits: 0,
          offers: 0,
          note: "",
        }}
      />
    </div>
  );
}
