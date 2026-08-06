import Link from "next/link";
import { logout } from "@/lib/actions/auth";

type NavItem = {
  href: string;
  label: string;
};

export default function TopNav({
  items,
  userLabel,
  homeHref,
  extra,
}: {
  items: NavItem[];
  userLabel: string;
  homeHref: string;
  extra?: React.ReactNode;
}) {
  return (
    <header className="border-b border-ink-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-6">
          <Link href={homeHref} className="text-base font-semibold text-brand-500">
            Mon suivi perso
          </Link>
          <nav className="flex flex-wrap gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-brand-50 hover:text-brand-500"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {extra}
          <span className="hidden text-sm text-ink-500 sm:inline">{userLabel}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
