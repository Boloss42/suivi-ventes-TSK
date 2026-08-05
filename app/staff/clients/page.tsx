import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: { user: true, _count: { select: { vehicles: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Clients</h1>
        <Link
          href="/staff/clients/new"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          + Nouveau client
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-100 bg-ink-50 text-ink-600">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Véhicules</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr
                key={client.id}
                className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/staff/clients/${client.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {client.firstName} {client.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-600">{client.user.email}</td>
                <td className="px-4 py-3 text-ink-600">{client.phone ?? "—"}</td>
                <td className="px-4 py-3 text-ink-600">
                  {client._count.vehicles}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-400">
                  Aucun client pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
