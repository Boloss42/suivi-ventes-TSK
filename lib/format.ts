export function formatPrice(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatMileage(km: number) {
  return `${new Intl.NumberFormat("fr-FR").format(km)} km`;
}

/** Nombre de jours écoulés depuis `date`. */
export function daysSince(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

/** Ancienneté du mandat en langage naturel : « 47 jours », « Près de 2 mois », « 3 mois ». */
export function formatMandateAge(date: Date | string) {
  const days = daysSince(date);
  if (days < 45) return `${days} jour${days > 1 ? "s" : ""}`;
  const months = days / 30.44;
  const rounded = Math.round(months);
  // Entre X,5 et X,9 mois → « Près de (X+1) mois ».
  if (months - Math.floor(months) >= 0.5 && rounded > Math.floor(months)) {
    return `Près de ${rounded} mois`;
  }
  return `${rounded} mois`;
}

export const vehicleStatusLabels: Record<string, string> = {
  EN_VENTE: "En vente",
  VENDU: "Vendu",
  RETIRE: "Retiré",
};

export const vehicleStatusStyles: Record<string, string> = {
  EN_VENTE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  VENDU: "bg-blue-50 text-blue-700 border-blue-200",
  RETIRE: "bg-gray-100 text-gray-600 border-gray-200",
};
