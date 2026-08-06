import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import ProfileForm from "./ProfileForm";

export default async function StaffProfilePage() {
  const { userId, session } = await requireStaff();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, phone: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Mon profil</h1>

      <div className="max-w-md rounded-lg border border-ink-100 bg-white p-6">
        <p className="mb-4 text-sm text-ink-500">
          Connecté en tant que <span className="font-medium text-ink-800">{session.user.email}</span>
        </p>
        <ProfileForm
          currentFirstName={user?.firstName ?? ""}
          currentPhone={user?.phone ?? ""}
        />
      </div>
    </div>
  );
}
