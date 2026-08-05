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
