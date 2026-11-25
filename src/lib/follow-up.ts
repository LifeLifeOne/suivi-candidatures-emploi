import { z } from "zod";

export const MAX_FOLLOW_UP_NOTE_LENGTH = 10_000;

export function calendarDate(date = new Date(), timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", day: "2-digit", ...(timeZone ? { timeZone } : {}) }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function followUpSchema(today: string) {
  return z.object({
    date: z.string().refine((value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Renseignez une date valide.").refine((value) => value <= today, "La relance doit avoir été effectuée : choisissez une date non future."),
    note: z.string().trim().max(MAX_FOLLOW_UP_NOTE_LENGTH, "La note ne peut pas dépasser 10 000 caractères."),
  });
}

export type FollowUpState = { success: boolean; message?: string; fieldErrors?: { date?: string[]; note?: string[] } };
