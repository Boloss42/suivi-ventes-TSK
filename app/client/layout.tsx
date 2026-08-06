import TopNav from "@/components/TopNav";
import NotificationBell from "@/components/client/NotificationBell";
import { requireClient } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const NAV_ITEMS = [
  { href: "/client/dashboard", label: "Mes véhicules" },
  { href: "/client/reviews", label: "Avis Google" },
];

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, clientId } = await requireClient();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.notification.count({ where: { clientId, read: false } }),
  ]);

  return (
    <div className="min-h-screen bg-ink-50">
      <TopNav
        items={NAV_ITEMS}
        userLabel={session.user.email ?? ""}
        homeHref="/client/dashboard"
        extra={
          <NotificationBell
            notifications={notifications.map((n) => ({
              id: n.id,
              message: n.message,
              read: n.read,
              createdAt: n.createdAt.toISOString(),
              vehicleId: n.vehicleId,
              type: n.type,
            }))}
            unreadCount={unreadCount}
          />
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
