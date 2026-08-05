import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** À utiliser dans les pages/actions de l'espace staff : vérifie le rôle en plus du middleware. */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STAFF") {
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
