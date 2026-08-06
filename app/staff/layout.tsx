import TopNav from "@/components/TopNav";
import { requireStaff } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/staff/dashboard", label: "Tableau de bord" },
  { href: "/staff/clients", label: "Clients" },
  { href: "/staff/vehicles", label: "Véhicules" },
  { href: "/staff/reviews", label: "Avis Google" },
  { href: "/staff/profile", label: "Mon profil" },
];

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await requireStaff();

  return (
    <div className="min-h-screen bg-ink-50">
      <TopNav
        items={NAV_ITEMS}
        userLabel={session.user.email ?? ""}
        homeHref="/staff/dashboard"
      />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
