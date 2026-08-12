"use client";

import { useState, type ReactNode } from "react";

/**
 * Carte repliable — pensée pour alléger la lecture sur mobile : le contenu est
 * masqué par défaut et se déplie au clic sur l'en-tête. Sur desktop (lg+), la
 * carte est toujours ouverte et l'en-tête n'est plus interactif (le chevron
 * disparaît), pour conserver la mise en page riche du bureau.
 */
export default function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left lg:cursor-default"
      >
        <h2 className="text-sm font-semibold text-ink-800">{title}</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-ink-400 transition-transform lg:hidden ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className={`${open ? "mt-3 block" : "hidden"} lg:mt-3 lg:block`}>{children}</div>
    </div>
  );
}
