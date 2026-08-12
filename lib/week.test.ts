import { describe, it, expect } from "vitest";
import { currentWeekStart } from "@/lib/week";

describe("currentWeekStart", () => {
  it("renvoie le lundi à minuit de la semaine contenant la date", () => {
    // Mercredi 7 janvier 2026 → lundi 5 janvier 2026.
    const monday = currentWeekStart(new Date(2026, 0, 7, 15, 30));
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(0);
    expect(monday.getDate()).toBe(5);
    expect(monday.getDay()).toBe(1); // lundi
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
  });

  it("renvoie le lundi lui-même quand la date est un lundi", () => {
    const monday = currentWeekStart(new Date(2026, 0, 5, 9, 0));
    expect(monday.getDate()).toBe(5);
    expect(monday.getDay()).toBe(1);
  });
});
