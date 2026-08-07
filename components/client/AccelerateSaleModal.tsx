"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

/**
 * Bouton « Accélérer ma vente » (affiché quand le diagnostic ne conclut pas à
 * un prix trop élevé). Ouvre une pop-up présentant deux leviers pour vendre
 * plus vite : partager l'annonce à son réseau, ou baisser le tarif pour se
 * rapprocher du prix de conseil. Chaque option renvoie vers le bloc concerné
 * de la page (#partager-annonce / #proposer-prix).
 */
export default function AccelerateSaleModal({
  advisedPrice,
  currentPrice,
}: {
  advisedPrice: number | null;
  currentPrice: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Le tarif de conseil n'est un vrai levier « à la baisse » que s'il est
  // inférieur au prix actuel.
  const canLowerToAdvised = advisedPrice != null && advisedPrice < currentPrice;

  function goToShare() {
    setOpen(false);
    document.getElementById("partager-annonce")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function goToPriceProposal() {
    setOpen(false);
    // Réinitialise puis repositionne le hash pour (re)déclencher le
    // pré-remplissage du champ de proposition, même si on y était déjà.
    if (window.location.hash === "#proposer-prix") {
      window.location.hash = "";
    }
    window.location.hash = "#proposer-prix";
    document.getElementById("proposer-prix")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
      >
        Accélérer ma vente →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Accélérer ma vente</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-md p-1 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
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
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-sm text-ink-500">
              Deux leviers pour trouver un acheteur plus rapidement.
            </p>

            <div className="space-y-3">
              {/* Levier 1 : partage */}
              <div className="rounded-lg border border-ink-100 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                  </span>
                  <h3 className="text-sm font-semibold text-ink-800">
                    Partager l&apos;annonce à mon réseau
                  </h3>
                </div>
                <p className="mb-3 text-sm text-ink-500">
                  Diffusez votre lien par SMS, email ou réseaux sociaux : chaque
                  visite amenée par votre réseau augmente vos chances de vendre.
                </p>
                <button
                  type="button"
                  onClick={goToShare}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                >
                  Partager mon annonce →
                </button>
              </div>

              {/* Levier 2 : ajustement du tarif */}
              <div className="rounded-lg border border-ink-100 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M12 20V4M5 13l7 7 7-7" />
                    </svg>
                  </span>
                  <h3 className="text-sm font-semibold text-ink-800">
                    Baisser le tarif
                  </h3>
                </div>
                <p className="mb-3 text-sm text-ink-500">
                  {canLowerToAdvised ? (
                    <>
                      Rapprochez votre prix du prix de conseil
                      {" "}
                      (<span className="font-medium text-ink-700">{formatPrice(advisedPrice!)}</span>)
                      {" "}
                      pour attirer davantage d&apos;acheteurs.
                    </>
                  ) : (
                    <>
                      Proposez un tarif plus attractif : un prix ajusté élargit le
                      nombre d&apos;acheteurs potentiels.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={goToPriceProposal}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                >
                  Proposer un ajustement de prix →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
