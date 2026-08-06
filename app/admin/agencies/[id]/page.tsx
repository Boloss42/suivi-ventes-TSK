import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import EditAgencyForm from "./EditAgencyForm";
import NewAgencyStaffForm from "./NewAgencyStaffForm";
import AgencyStaffRow from "./AgencyStaffRow";
import AssignClientRow from "./AssignClientRow";

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [agency, unassignedClients] = await Promise.all([
    prisma.agency.findUnique({
      where: { id },
      include: {
        staff: { orderBy: { createdAt: "asc" } },
        _count: { select: { clients: true, vehicles: true } },
      },
    }),
    prisma.client.findMany({
      where: { agencyId: id, assignedStaffId: null },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  if (!agency) notFound();

  const quotaReached = agency.staff.length >= agency.maxStaffAccounts;
  const staffOptions = agency.staff.map((user) => ({ id: user.id, email: user.email }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900">{agency.name}</h1>
        <p className="text-sm text-ink-500">
          Créée le {formatDate(agency.createdAt)} · {agency._count.clients} client
          {agency._count.clients > 1 ? "s" : ""} · {agency._count.vehicles} véhicule
          {agency._count.vehicles > 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-lg border border-ink-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink-800">Informations</h2>
          <EditAgencyForm
            agencyId={agency.id}
            name={agency.name}
            maxStaffAccounts={agency.maxStaffAccounts}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold text-ink-800">Nouvel agent</h2>
            <p className="mb-4 text-sm text-ink-500">
              {agency.staff.length} / {agency.maxStaffAccounts} comptes agents utilisés.
            </p>
            <NewAgencyStaffForm agencyId={agency.id} quotaReached={quotaReached} />
          </div>

          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold text-ink-800">
              Comptes agents ({agency.staff.length})
            </h2>
            {agency.staff.length === 0 ? (
              <p className="text-sm text-ink-400">Aucun agent pour le moment.</p>
            ) : (
              <div className="divide-y divide-ink-100">
                {agency.staff.map((user) => (
                  <AgencyStaffRow
                    key={user.id}
                    agencyId={agency.id}
                    userId={user.id}
                    email={user.email}
                    createdAt={user.createdAt.toISOString()}
                    isPending={!!user.inviteToken}
                  />
                ))}
              </div>
            )}
          </div>

          {unassignedClients.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
              <h2 className="mb-1 text-sm font-semibold text-ink-800">
                Clients non attribués ({unassignedClients.length})
              </h2>
              <p className="mb-2 text-sm text-ink-500">
                Ces clients n&apos;ont plus de commercial (agent supprimé) et ne sont visibles
                d&apos;aucun agent tant qu&apos;ils ne sont pas réattribués.
              </p>
              <div className="divide-y divide-amber-100">
                {unassignedClients.map((client) => (
                  <AssignClientRow
                    key={client.id}
                    agencyId={agency.id}
                    clientId={client.id}
                    clientName={`${client.firstName} ${client.lastName}`}
                    staffOptions={staffOptions}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
