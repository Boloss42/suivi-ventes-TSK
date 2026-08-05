import { prisma } from "@/lib/prisma";
import VehicleForm from "@/components/VehicleForm";
import { createVehicle } from "@/lib/actions/vehicles";

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const clients = await prisma.client.findMany({
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Nouveau véhicule</h1>
      <VehicleForm
        action={createVehicle}
        submitLabel="Créer le véhicule"
        clients={clients}
        defaultClientId={clientId}
        allowNewClient
      />
    </div>
  );
}
