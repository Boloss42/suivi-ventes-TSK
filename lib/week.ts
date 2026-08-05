import { startOfWeek, format } from "date-fns";
import { fr } from "date-fns/locale";

/** Lundi de la semaine contenant `date` (par défaut aujourd'hui), à minuit. */
export function currentWeekStart(date: Date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function formatWeekLabel(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `Semaine du ${format(d, "d MMMM yyyy", { locale: fr })}`;
}

export function formatWeekShort(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d MMM", { locale: fr });
}
