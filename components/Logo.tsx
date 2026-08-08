/**
 * Logo « MyVitrine » — un « V » formé de deux traits arrondis (bras gauche
 * gris, bras droit rose de marque) avec une pastille ronde en haut du bras
 * droit. Géométrie reprise à l'identique du fichier fourni (vitrine-logo.svg).
 *
 * `className` pilote la taille (ex. `h-8 w-8`).
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="MyVitrine"
      fill="none"
    >
      <line
        x1="16"
        y1="16"
        x2="50"
        y2="86"
        stroke="oklch(58% 0.012 260)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="86"
        x2="84"
        y2="16"
        stroke="#ec028c"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="84" cy="16" r="8.5" fill="#ec028c" />
    </svg>
  );
}
