import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** À utiliser dans les pages/actions de l'espace staff : vérifie le rôle + renvoie l'agencyId. */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STAFF") {
    redirect("/login");
  }
  return { session, agencyId: session.user.agencyId as string, userId: session.user.id };
}

/** À utiliser dans les pages/actions de l'espace admin : vérifie le rôle super-admin. */
export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }
  return session;
}

/** À utiliser dans les pages/actions de l'espace client : vérifie le rôle + renvoie le clientId. */
export async function requireClient() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }
  return { session, clientId: session.user.clientId as string };
}
