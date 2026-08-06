import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import EditClientForm from "./EditClientForm";
import InviteLinkButton from "./InviteLinkButton";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { agencyId, userId } = await requireStaff();
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, agencyId, assignedStaffId: userId },
    include: { user: true, vehicles: { orderBy: { createdAt: "desc" } } },
  });

  if (!client) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900">
          {client.firstName} {client.lastName}
        </h1>
        <p className="text-sm text-ink-500">Client depuis le {formatDate(client.createdAt)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-ink-800">Informations</h2>
            <EditClientForm
              clientId={client.id}
              firstName={client.firstName}
              lastName={client.lastName}
              email={client.user.email}
              phone={client.phone ?? ""}
            />
          </div>
          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Accès client</h2>
            <p className="mb-3 text-xs text-ink-500">
              Génère un nouveau lien d&apos;activation (utile en cas de mot de
              passe oublié, ou si le premier lien a expiré).
            </p>
            <InviteLinkButton clientId={client.id} />
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-800">
              Véhicules ({client.vehicles.length})
            </h2>
            <Link
              href={`/staff/vehicles/new?clientId=${client.id}`}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              + Ajouter un véhicule
            </Link>
          </div>

          <div className="space-y-3">
            {client.vehicles.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/staff/vehicles/${vehicle.id}`}
                className="flex items-center justify-between rounded-lg border border-ink-100 bg-white p-4 transition hover:border-brand-300"
              >
                <div>
                  <p className="font-medium text-ink-900">
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                  </p>
                  <p className="text-sm text-ink-500">{vehicle.reference}</p>
                </div>
                <StatusBadge status={vehicle.status} />
              </Link>
            ))}
            {client.vehicles.length === 0 && (
              <p className="rounded-lg border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
                Aucun véhicule pour ce client.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
