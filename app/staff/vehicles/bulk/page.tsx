import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import BulkVehicleForm from "@/components/BulkVehicleForm";

export default async function BulkVehiclesPage() {
  const { agencyId, userId } = await requireStaff();
  const clients = await prisma.client.findMany({
    where: { agencyId, assignedStaffId: userId },
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Ajout de véhicules en masse</h1>
        <Link
          href="/staff/vehicles/new"
          className="text-sm font-medium text-ink-500 hover:underline"
        >
          Ajout unitaire
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="mb-3">
            Vous devez d&apos;abord créer au moins un client : chaque véhicule doit
            être rattaché à un client propriétaire.
          </p>
          <Link
            href="/staff/clients/new"
            className="inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Créer un client
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 max-w-2xl text-sm text-ink-500">
            Saisissez plusieurs véhicules d&apos;un coup. Chaque ligne est rattachée
            à son propre client. Les photos et liens d&apos;annonce s&apos;ajoutent
            ensuite depuis chaque fiche. Jusqu&apos;à 50 véhicules par lot.
          </p>
          <BulkVehicleForm clients={clients} />
        </>
      )}
    </div>
  );
}
