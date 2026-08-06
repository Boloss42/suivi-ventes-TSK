import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export default async function AgenciesPage() {
  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { staff: true, clients: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Agences ({agencies.length})</h1>
        <Link
          href="/admin/agencies/new"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + Nouvelle agence
        </Link>
      </div>

      {agencies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-200 bg-white p-8 text-center text-ink-400">
          Aucune agence pour le moment.
        </p>
      ) : (
        <div className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
          {agencies.map((agency) => (
            <Link
              key={agency.id}
              href={`/admin/agencies/${agency.id}`}
              className="flex items-center justify-between gap-4 p-4 transition hover:bg-ink-50"
            >
              <div>
                <p className="font-medium text-ink-900">{agency.name}</p>
                <p className="text-sm text-ink-500">
                  Créée le {formatDate(agency.createdAt)} · {agency._count.clients} client
                  {agency._count.clients > 1 ? "s" : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium text-ink-700">
                {agency._count.staff} / {agency.maxStaffAccounts} comptes agents
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
