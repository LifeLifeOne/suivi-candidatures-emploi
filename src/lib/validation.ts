import { z } from "zod";
import { APPLICATION_STATUSES } from "@/lib/status";
import {
  cleanTagName,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_APPLICATION,
  normalizeTagName,
} from "@/lib/tags";
import { WORK_MODES } from "@/lib/work-mode";

const optionalUrl = z
  .string()
  .trim()
  .max(500, "Le lien est trop long.")
  .refine((value) => value === "" || /^https?:\/\//i.test(value), {
    message: "Le lien doit commencer par http:// ou https://.",
  });

const optionalCoordinate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().optional(),
);

const tagSchema = z.string().transform(cleanTagName).pipe(
  z.string().min(1, "Le tag ne peut pas être vide.").max(MAX_TAG_LENGTH, "Le tag est trop long."),
);

export const applicationSchema = z
  .object({
    company: z.string().trim().min(1, "L’entreprise est obligatoire.").max(120),
    title: z.string().trim().min(1, "L’intitulé du poste est obligatoire.").max(160),
    offerUrl: optionalUrl,
    location: z.string().trim().max(160),
    cityCode: z.string().trim().max(5),
    latitude: optionalCoordinate,
    longitude: optionalCoordinate,
    workMode: z.enum(WORK_MODES),
    tags: z
      .array(tagSchema)
      .min(1, "Ajoutez au moins un tag.")
      .max(MAX_TAGS_PER_APPLICATION, `Vous pouvez ajouter jusqu’à ${MAX_TAGS_PER_APPLICATION} tags.`),
    applicationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "La date de candidature est invalide."),
    status: z.enum(APPLICATION_STATUSES),
    notes: z.string().trim().max(5000, "Les notes sont trop longues."),
  })
  .superRefine((value, context) => {
    const normalizedTags = value.tags.map(normalizeTagName);
    if (new Set(normalizedTags).size !== normalizedTags.length) {
      context.addIssue({
        code: "custom",
        path: ["tags"],
        message: "Un même tag ne peut être ajouté qu’une fois.",
      });
    }

    const hasLocation = value.location.length > 0;
    const hasCoordinates = value.latitude !== undefined && value.longitude !== undefined;
    if (hasLocation && (!value.cityCode || !hasCoordinates)) {
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "Sélectionnez une ville dans les suggestions.",
      });
    }
    if (!hasLocation && (value.cityCode || value.latitude !== undefined || value.longitude !== undefined)) {
      context.addIssue({ code: "custom", path: ["location"], message: "La ville est invalide." });
    }
    if (value.latitude !== undefined && (value.latitude < -90 || value.latitude > 90)) {
      context.addIssue({ code: "custom", path: ["location"], message: "La latitude est invalide." });
    }
    if (value.longitude !== undefined && (value.longitude < -180 || value.longitude > 180)) {
      context.addIssue({ code: "custom", path: ["location"], message: "La longitude est invalide." });
    }
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;

export type ActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Partial<Record<keyof ApplicationInput, string[]>>;
  values?: Partial<Record<"company" | "title" | "offerUrl" | "applicationDate" | "status" | "workMode" | "notes", string>>;
};

export const INITIAL_ACTION_STATE: ActionState = { success: false };

export function formDataToApplicationInput(formData: FormData) {
  const tags = [
    ...formData.getAll("tags").map(String),
    String(formData.get("tagDraft") ?? ""),
  ].filter((tag) => tag.trim().length > 0);

  return {
    company: String(formData.get("company") ?? ""),
    title: String(formData.get("title") ?? ""),
    offerUrl: String(formData.get("offerUrl") ?? ""),
    location: String(formData.get("location") ?? ""),
    cityCode: String(formData.get("cityCode") ?? ""),
    latitude: String(formData.get("latitude") ?? ""),
    longitude: String(formData.get("longitude") ?? ""),
    workMode: String(formData.get("workMode") ?? "unspecified"),
    tags,
    applicationDate: String(formData.get("applicationDate") ?? ""),
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}
