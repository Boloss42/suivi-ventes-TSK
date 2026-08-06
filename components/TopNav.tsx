"use client";

import { useState } from "react";
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
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="border-b border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-6">
            <Link href={homeHref} className="text-base font-semibold text-brand-500">
              Mon suivi perso
            </Link>
            <nav className="hidden flex-wrap gap-1 sm:flex">
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

          {/* Profil / déconnexion : visible en permanence sur desktop, regroupé
              derrière un bouton sur mobile pour ne pas se mélanger à la nav. */}
          <div className="hidden items-center gap-3 sm:flex">
            {extra}
            <span className="text-sm text-ink-500">{userLabel}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
              >
                Déconnexion
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            {extra}
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="Profil"
              aria-expanded={profileOpen}
              className="rounded-md border border-ink-200 p-2 text-ink-700 transition hover:bg-ink-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Nav principale sur mobile : rangée dédiée, séparée du profil. */}
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-3 sm:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-full border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {profileOpen && (
        <div className="border-t border-ink-100 bg-ink-50 px-4 py-3 sm:hidden">
          <p className="mb-3 truncate text-sm text-ink-500">{userLabel}</p>
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100"
            >
              Déconnexion
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
