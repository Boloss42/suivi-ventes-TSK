import { prisma } from "@/lib/prisma";
import ActivateForm from "./ActivateForm";

export default async function ActivatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  const isValid = !!user && !!user.inviteTokenExpiresAt && user.inviteTokenExpiresAt > new Date();

  if (!isValid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-ink-100 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-lg font-semibold text-ink-900">Lien invalide ou expiré</h1>
          <p className="text-sm text-ink-500">
            Ce lien d&apos;activation n&apos;est plus valide. Contactez Mon suivi perso pour en
            recevoir un nouveau.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-ink-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-brand-500">Mon suivi perso</h1>
          <p className="mt-1 text-sm text-ink-500">
            {user.role === "STAFF" ? "Activez votre accès staff" : "Activez votre espace client"}
          </p>
        </div>
        <ActivateForm token={token} email={user.email} />
      </div>
    </main>
  );
}
