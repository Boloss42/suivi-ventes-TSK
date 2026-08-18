import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import SearchField from "@/components/SearchField";
import ClientStatusBadge from "@/components/ClientStatusBadge";
import DeleteClientButton from "./DeleteClientButton";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { agencyId, userId } = await requireStaff();
  const { q, status: statusParam } = await searchParams;
  // Actif = a encore au moins un véhicule en vente ; visible par défaut.
  // Inactif : uniquement sur clic sur l'onglet dédié (?status=inactif).
  const status = statusParam === "inactif" ? "inactif" : "actif";

  const clients = await prisma.client.findMany({
    where: {
      agencyId,
      assignedStaffId: userId,
      vehicles:
        status === "inactif" ? { none: { status: "EN_VENTE" } } : { some: { status: "EN_VENTE" } },
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      user: true,
      _count: { select: { vehicles: true } },
      // Un seul véhicule en vente suffit à rendre le client « Actif ».
      vehicles: { where: { status: "EN_VENTE" }, select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusFilters = [
    { value: "actif" as const, label: "Actif" },
    { value: "inactif" as const, label: "Inactif" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">Clients</h1>
        <Link
          href="/staff/clients/new"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          + Nouveau client
        </Link>
      </div>

      <div className="mb-4">
        <SearchField placeholder="Rechercher un client (nom, email, téléphone)..." />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const params = new URLSearchParams();
          if (filter.value !== "actif") params.set("status", filter.value);
          if (q) params.set("q", q);
          const query = params.toString();
          return (
            <Link
              key={filter.value}
              href={query ? `/staff/clients?${query}` : "/staff/clients"}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                status === filter.value
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-ink-200 text-ink-600 hover:bg-white"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-100 bg-ink-50 text-ink-600">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Véhicules</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium"></th>
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
                <td className="px-4 py-3">
                  <ClientStatusBadge active={client.vehicles.length > 0} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <DeleteClientButton
                    clientId={client.id}
                    clientLabel={`${client.firstName} ${client.lastName}`}
                  />
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                  {q
                    ? "Aucun client ne correspond à cette recherche."
                    : status === "inactif"
                      ? "Aucun client inactif."
                      : "Aucun client actif pour le moment."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
