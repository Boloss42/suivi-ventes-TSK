import TopNav from "@/components/TopNav";
import { requireSuperAdmin } from "@/lib/session";

const NAV_ITEMS = [{ href: "/admin/agencies", label: "Agences" }];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-ink-50">
      <TopNav
        items={NAV_ITEMS}
        userLabel={session.user.email ?? ""}
        homeHref="/admin/agencies"
      />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
