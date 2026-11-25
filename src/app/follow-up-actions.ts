"use server";

import { revalidatePath } from "next/cache";
import { removeFollowUp, saveFollowUp } from "@/db/repository";
import { calendarDate, followUpSchema, type FollowUpState } from "@/lib/follow-up";

function validId(id: number) { return Number.isInteger(id) && id > 0; }

export async function saveFollowUpAction(applicationId: number, followUpId: number | undefined, _previous: FollowUpState, formData: FormData): Promise<FollowUpState> {
  if (!validId(applicationId) || (followUpId !== undefined && !validId(followUpId))) return { success: false, message: "Relance invalide." };
  let today: string;
  try { today = calendarDate(new Date(), String(formData.get("timeZone") || "UTC")); }
  catch { return { success: false, message: "Le fuseau horaire est invalide." }; }
  const parsed = followUpSchema(today).safeParse({ date: String(formData.get("date") ?? ""), note: String(formData.get("note") ?? "") });
  if (!parsed.success) return { success: false, message: "Vérifiez les champs signalés.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    if (!saveFollowUp(applicationId, parsed.data, followUpId)) return { success: false, message: "Cette candidature ou cette relance n’existe plus." };
    revalidatePath("/");
    revalidatePath(`/candidatures/${applicationId}`);
    return { success: true, message: followUpId === undefined ? "Relance enregistrée." : "Relance modifiée." };
  } catch { return { success: false, message: "La relance n’a pas pu être enregistrée. Réessayez." }; }
}

export async function deleteFollowUpAction(applicationId: number, followUpId: number): Promise<FollowUpState> {
  if (!validId(applicationId) || !validId(followUpId)) return { success: false, message: "Relance invalide." };
  try {
    if (!removeFollowUp(applicationId, followUpId)) return { success: false, message: "Cette relance n’existe plus." };
    revalidatePath("/");
    revalidatePath(`/candidatures/${applicationId}`);
    return { success: true, message: "Relance supprimée." };
  } catch { return { success: false, message: "La relance n’a pas pu être supprimée. Réessayez." }; }
}
