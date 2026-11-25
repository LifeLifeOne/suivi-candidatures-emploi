"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addApplicationDocument,
  addQuickFile,
  findQuickFile,
  removeQuickFile,
  createApplication,
  findApplication,
  findApplicationDocument,
  listApplicationDocuments,
  removeApplicationDocument,
  removeApplication,
  setApplicationStatus,
  updateApplication,
} from "@/db/repository";
import {
  deleteStoredDocument,
  saveDocument,
  validateDocument,
} from "@/lib/document-storage";
import { isApplicationStatus } from "@/lib/status";
import {
  applicationSchema,
  formDataToApplicationInput,
  type ActionState,
  type ApplicationInput,
} from "@/lib/validation";

function validationState(formData: FormData) {
  return applicationSchema.safeParse(formDataToApplicationInput(formData));
}

function submittedValues(formData: FormData): ActionState["values"] {
  const input = formDataToApplicationInput(formData);
  return {
    company: input.company,
    title: input.title,
    offerUrl: input.offerUrl,
    applicationDate: input.applicationDate,
    status: input.status,
    workMode: input.workMode,
    notes: input.notes,
  };
}

function invalidState(
  error: { flatten: () => { fieldErrors: unknown } },
  formData: FormData,
): ActionState {
  return {
    success: false,
    message: "Vérifiez les champs signalés.",
    fieldErrors: error.flatten().fieldErrors as ActionState["fieldErrors"],
    values: submittedValues(formData),
  };
}

export async function createApplicationAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = validationState(formData);
  if (!parsed.success) return invalidState(parsed.error, formData);

  let id: number;
  try {
    id = createApplication(parsed.data as ApplicationInput).id;
  } catch {
    return { success: false, message: "La candidature n’a pas pu être enregistrée.", values: submittedValues(formData) };
  }

  revalidatePath("/");
  redirect(`/candidatures/${id}`);
}

export async function updateApplicationAction(
  id: number,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, message: "Candidature invalide." };
  }

  const parsed = validationState(formData);
  if (!parsed.success) return invalidState(parsed.error, formData);

  try {
    const updated = updateApplication(id, parsed.data as ApplicationInput);
    if (!updated) return { success: false, message: "Cette candidature n’existe plus.", values: submittedValues(formData) };
  } catch {
    return { success: false, message: "Les modifications n’ont pas pu être enregistrées.", values: submittedValues(formData) };
  }

  revalidatePath("/");
  revalidatePath(`/candidatures/${id}`);
  redirect(`/candidatures/${id}?updated=1`);
}

export async function changeApplicationStatusAction(id: number, status: string) {
  if (!Number.isInteger(id) || id <= 0 || !isApplicationStatus(status)) {
    return { success: false, message: "Statut invalide." };
  }

  try {
    const result = setApplicationStatus(id, status);
    if (!result.found) return { success: false, message: "Cette candidature n’existe plus." };
    revalidatePath("/");
    revalidatePath(`/candidatures/${id}`);
    return { success: true, changed: result.changed };
  } catch {
    return { success: false, message: "Le statut n’a pas pu être modifié." };
  }
}

export async function deleteApplicationAction(id: number) {
  if (Number.isInteger(id) && id > 0) {
    const documents = listApplicationDocuments(id);
    if (removeApplication(id)) {
      await Promise.allSettled(documents.map((document) => deleteStoredDocument(document.storedName)));
    }
  }
  revalidatePath("/");
  redirect("/");
}

export type DocumentActionState = {
  success: boolean;
  message?: string;
  completedAt?: number;
};

export async function uploadApplicationDocumentAction(
  applicationId: number,
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!Number.isInteger(applicationId) || applicationId <= 0 || !findApplication(applicationId)) {
    return { success: false, message: "Cette candidature n’existe plus." };
  }

  const file = formData.get("document");
  if (!(file instanceof File)) {
    return { success: false, message: "Sélectionnez un document." };
  }

  const validation = await validateDocument(file);
  if (!validation.success) return validation;

  let storedName: string | undefined;
  try {
    storedName = await saveDocument(validation.bytes, validation.type.extension);
    addApplicationDocument({
      applicationId,
      originalName: validation.originalName,
      storedName,
      mimeType: validation.type.mimeType,
      size: validation.bytes.byteLength,
    });
  } catch {
    if (storedName) await deleteStoredDocument(storedName).catch(() => undefined);
    return { success: false, message: "Le document n’a pas pu être enregistré." };
  }

  revalidatePath(`/candidatures/${applicationId}`);
  return { success: true, message: "Document ajouté.", completedAt: Date.now() };
}

export async function deleteApplicationDocumentAction(applicationId: number, documentId: number) {
  if (!Number.isInteger(applicationId) || !Number.isInteger(documentId)) return;
  const existing = findApplicationDocument(applicationId, documentId);
  if (!existing) return;

  const removed = removeApplicationDocument(applicationId, documentId);
  if (removed) await deleteStoredDocument(removed.storedName).catch(() => undefined);
  revalidatePath(`/candidatures/${applicationId}`);
}

export async function uploadQuickFileAction(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const file = formData.get("document");
  if (!(file instanceof File)) return { success: false, message: "Sélectionnez un fichier." };

  const validation = await validateDocument(file, { allowText: true });
  if (!validation.success) return validation;

  let storedName: string | undefined;
  try {
    storedName = await saveDocument(validation.bytes, validation.type.extension);
    addQuickFile({
      originalName: validation.originalName,
      storedName,
      mimeType: validation.type.mimeType,
      size: validation.bytes.byteLength,
    });
  } catch {
    if (storedName) await deleteStoredDocument(storedName).catch(() => undefined);
    return { success: false, message: "Le fichier n’a pas pu être enregistré." };
  }

  revalidatePath("/");
  return { success: true, message: "Fichier ajouté.", completedAt: Date.now() };
}

export async function deleteQuickFileAction(fileId: number) {
  if (!Number.isInteger(fileId) || !findQuickFile(fileId)) return;
  const removed = removeQuickFile(fileId);
  if (removed) await deleteStoredDocument(removed.storedName).catch(() => undefined);
  revalidatePath("/");
}
