import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import NewStaffForm from "./NewStaffForm";
import StaffRow from "./StaffRow";

export default async function TeamPage() {
  const session = await requireStaff();

  const staffAccounts = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Équipe</h1>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-ink-800">Nouveau compte staff</h2>
        <NewStaffForm />
      </div>

      <div className="rounded-lg border border-ink-100 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink-800">
          Comptes staff ({staffAccounts.length})
        </h2>
        <p className="mb-2 text-sm text-ink-500">
          Un compte staff a accès à l&apos;ensemble des clients et véhicules, sans
          restriction.
        </p>
        <div className="divide-y divide-ink-100">
          {staffAccounts.map((user) => (
            <StaffRow
              key={user.id}
              userId={user.id}
              email={user.email}
              createdAt={user.createdAt.toISOString()}
              isPending={!!user.inviteToken}
              isSelf={user.id === session.user.id}
              canDelete={staffAccounts.length > 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
