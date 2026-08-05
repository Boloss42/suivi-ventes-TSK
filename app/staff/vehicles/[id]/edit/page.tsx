import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VehicleForm from "@/components/VehicleForm";
import { updateVehicle } from "@/lib/actions/vehicles";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [vehicle, clients] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { id },
      include: { listingUrls: true, photos: { orderBy: { order: "asc" } } },
    }),
    prisma.client.findMany({
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!vehicle) notFound();

  const updateWithId = updateVehicle.bind(null, vehicle.id);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">
        Modifier {vehicle.make} {vehicle.model}
      </h1>
      <VehicleForm
        action={updateWithId}
        submitLabel="Enregistrer les modifications"
        clients={clients}
        vehicleId={vehicle.id}
        existingPhotos={vehicle.photos}
        defaultValues={{
          clientId: vehicle.clientId,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          mileage: vehicle.mileage,
          fuelType: vehicle.fuelType,
          reference: vehicle.reference,
          price: vehicle.price,
          status: vehicle.status,
          depositDate: vehicle.depositDate.toISOString().slice(0, 10),
          listingUrls: vehicle.listingUrls.map((l) => ({ label: l.label, url: l.url })),
        }}
      />
    </div>
  );
}
