"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  // La modale est rendue via un portail sur <body> : un ancêtre transformé
  // (cartes en `animate-rise`) piège sinon un `position: fixed` et la modale
  // s'affiche « dans » la carte « Chances de vente » au lieu de couvrir l'écran.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        className="press inline-flex items-center gap-1 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
      >
        Accélérer ma vente →
      </button>

      {mounted && open && createPortal(
        <div
          className="animate-fade fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Accélérer ma vente"
        >
          <div
            className="animate-sheet flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-8 sm:animate-rise"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Poignée du bottom sheet (mobile uniquement). */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink-200 sm:hidden" />

            <div className="mb-1 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-ink-900 sm:text-xl">
                Accélérer ma vente
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="-mr-1 shrink-0 rounded-md p-1.5 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
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
            <p className="mb-6 text-sm text-ink-500 sm:text-base">
              Deux leviers concrets pour trouver un acheteur plus rapidement.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Levier 1 : partage */}
              <div className="card-lift flex flex-col rounded-xl border border-ink-100 bg-ink-50/40 p-5">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
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
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                  </svg>
                </span>
                <h3 className="mb-1.5 text-base font-semibold text-ink-900">
                  Partager l&apos;annonce à mon réseau
                </h3>
                <p className="mb-5 flex-1 text-sm text-ink-500">
                  Diffusez votre lien par SMS, email ou réseaux sociaux : chaque
                  visite amenée par votre réseau augmente vos chances de vendre.
                </p>
                <button
                  type="button"
                  onClick={goToShare}
                  className="press w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  Partager mon annonce →
                </button>
              </div>

              {/* Levier 2 : ajustement du tarif */}
              <div className="card-lift flex flex-col rounded-xl border border-ink-100 bg-ink-50/40 p-5">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
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
                    <path d="M12 20V4M5 13l7 7 7-7" />
                  </svg>
                </span>
                <h3 className="mb-1.5 text-base font-semibold text-ink-900">
                  Baisser le tarif
                </h3>
                <p className="mb-5 flex-1 text-sm text-ink-500">
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
                  className="press w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  Proposer un ajustement de prix →
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
