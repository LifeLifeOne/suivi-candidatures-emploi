import { and, asc, desc, eq, notExists } from "drizzle-orm";
import type { ApplicationInput } from "@/lib/validation";
import type { ApplicationStatus } from "@/lib/status";
import { normalizeTagName } from "@/lib/tags";
import { db, type AppDatabase } from "@/db/client";
import {
  applicationDocuments,
  applicationFollowUps,
  applications,
  applicationTags,
  quickFiles,
  statusHistory,
  tags,
} from "@/db/schema";
import type { ApplicationView, TagView } from "@/lib/application-view";

export function listApplications(database: AppDatabase = db) {
  const rows = database.select().from(applications).orderBy(desc(applications.applicationDate)).all();
  const tagRows = database
    .select({ applicationId: applicationTags.applicationId, id: tags.id, name: tags.name })
    .from(applicationTags)
    .innerJoin(tags, eq(applicationTags.tagId, tags.id))
    .orderBy(asc(tags.name))
    .all();
  return attachTags(rows, tagRows);
}

export function findApplication(id: number, database: AppDatabase = db) {
  const application = database.select().from(applications).where(eq(applications.id, id)).get();
  if (!application) return undefined;
  const applicationTagRows = database
    .select({ id: tags.id, name: tags.name })
    .from(applicationTags)
    .innerJoin(tags, eq(applicationTags.tagId, tags.id))
    .where(eq(applicationTags.applicationId, id))
    .orderBy(asc(tags.name))
    .all();
  return { ...application, tags: applicationTagRows } as ApplicationView;
}

export function listTags(database: AppDatabase = db) {
  return database.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name)).all();
}

function attachTags(
  rows: Array<typeof applications.$inferSelect>,
  tagRows: Array<TagView & { applicationId: number }>,
) {
  const byApplication = new Map<number, TagView[]>();
  for (const tag of tagRows) {
    const current = byApplication.get(tag.applicationId) ?? [];
    current.push({ id: tag.id, name: tag.name });
    byApplication.set(tag.applicationId, current);
  }
  return rows.map((application) => ({
    ...application,
    tags: byApplication.get(application.id) ?? [],
  })) as ApplicationView[];
}

function replaceApplicationTags(
  applicationId: number,
  names: string[],
  database: Parameters<Parameters<AppDatabase["transaction"]>[0]>[0],
) {
  database.delete(applicationTags).where(eq(applicationTags.applicationId, applicationId)).run();
  const now = Date.now();

  for (const name of names) {
    const normalizedName = normalizeTagName(name);
    database
      .insert(tags)
      .values({ name, normalizedName, createdAt: now })
      .onConflictDoNothing({ target: tags.normalizedName })
      .run();
    const tag = database.select({ id: tags.id }).from(tags).where(eq(tags.normalizedName, normalizedName)).get();
    if (tag) {
      database.insert(applicationTags).values({ applicationId, tagId: tag.id }).run();
    }
  }

  database
    .delete(tags)
    .where(
      notExists(
        database
          .select({ tagId: applicationTags.tagId })
          .from(applicationTags)
          .where(eq(applicationTags.tagId, tags.id)),
      ),
    )
    .run();
}

export function listStatusHistory(id: number, database: AppDatabase = db) {
  return database
    .select()
    .from(statusHistory)
    .where(eq(statusHistory.applicationId, id))
    .orderBy(desc(statusHistory.changedAt))
    .all();
}

export function listFollowUps(applicationId?: number, database: AppDatabase = db) {
  return database.select().from(applicationFollowUps)
    .where(applicationId === undefined ? undefined : eq(applicationFollowUps.applicationId, applicationId))
    .orderBy(desc(applicationFollowUps.date), desc(applicationFollowUps.id)).all();
}

export function saveFollowUp(applicationId: number, input: { date: string; note: string }, followUpId?: number, database: AppDatabase = db) {
  return database.transaction((tx) => {
    if (!tx.select({ id: applications.id }).from(applications).where(eq(applications.id, applicationId)).get()) return undefined;
    const now = Date.now();
    const saved = followUpId === undefined
      ? tx.insert(applicationFollowUps).values({ ...input, applicationId, createdAt: now, updatedAt: now }).returning().get()
      : tx.update(applicationFollowUps).set({ ...input, updatedAt: now })
        .where(and(eq(applicationFollowUps.id, followUpId), eq(applicationFollowUps.applicationId, applicationId))).returning().get();
    if (saved) tx.update(applications).set({ updatedAt: now }).where(eq(applications.id, applicationId)).run();
    return saved;
  });
}

export function removeFollowUp(applicationId: number, followUpId: number, database: AppDatabase = db) {
  return database.transaction((tx) => {
    const removed = tx.delete(applicationFollowUps).where(and(eq(applicationFollowUps.id, followUpId), eq(applicationFollowUps.applicationId, applicationId))).run().changes > 0;
    if (removed) tx.update(applications).set({ updatedAt: Date.now() }).where(eq(applications.id, applicationId)).run();
    return removed;
  });
}

export function listApplicationDocuments(id: number, database: AppDatabase = db) {
  return database
    .select()
    .from(applicationDocuments)
    .where(eq(applicationDocuments.applicationId, id))
    .orderBy(desc(applicationDocuments.createdAt))
    .all();
}

export function findApplicationDocument(
  applicationId: number,
  documentId: number,
  database: AppDatabase = db,
) {
  return database
    .select()
    .from(applicationDocuments)
    .where(
      and(
        eq(applicationDocuments.id, documentId),
        eq(applicationDocuments.applicationId, applicationId),
      ),
    )
    .get();
}

export function addApplicationDocument(
  input: {
    applicationId: number;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
  },
  database: AppDatabase = db,
) {
  return database
    .insert(applicationDocuments)
    .values({ ...input, createdAt: Date.now() })
    .returning()
    .get();
}

export function removeApplicationDocument(
  applicationId: number,
  documentId: number,
  database: AppDatabase = db,
) {
  const document = findApplicationDocument(applicationId, documentId, database);
  if (!document) return undefined;
  database.delete(applicationDocuments).where(eq(applicationDocuments.id, documentId)).run();
  return document;
}

export function createApplication(input: ApplicationInput, database: AppDatabase = db) {
  const now = Date.now();
  return database.transaction((tx) => {
    const created = tx
      .insert(applications)
      .values({
        company: input.company,
        title: input.title,
        offerUrl: input.offerUrl || null,
        location: input.location || null,
        cityCode: input.cityCode || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        workMode: input.workMode,
        applicationDate: input.applicationDate,
        status: input.status,
        notes: input.notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    replaceApplicationTags(created.id, input.tags, tx);

    tx.insert(statusHistory)
      .values({
        applicationId: created.id,
        fromStatus: null,
        toStatus: input.status,
        changedAt: now,
      })
      .run();

    return created;
  });
}

export function updateApplication(id: number, input: ApplicationInput, database: AppDatabase = db) {
  return database.transaction((tx) => {
    const current = tx.select().from(applications).where(eq(applications.id, id)).get();
    if (!current) return undefined;

    const now = Date.now();
    const updated = tx
      .update(applications)
      .set({
        company: input.company,
        title: input.title,
        offerUrl: input.offerUrl || null,
        location: input.location || null,
        cityCode: input.cityCode || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        workMode: input.workMode,
        applicationDate: input.applicationDate,
        status: input.status,
        notes: input.notes || null,
        updatedAt: now,
      })
      .where(eq(applications.id, id))
      .returning()
      .get();

    replaceApplicationTags(id, input.tags, tx);

    if (current.status !== input.status) {
      tx.insert(statusHistory)
        .values({
          applicationId: id,
          fromStatus: current.status,
          toStatus: input.status,
          changedAt: now,
        })
        .run();
    }

    return updated;
  });
}

export function setApplicationStatus(
  id: number,
  status: ApplicationStatus,
  database: AppDatabase = db,
) {
  return database.transaction((tx) => {
    const current = tx.select().from(applications).where(eq(applications.id, id)).get();
    if (!current) return { found: false, changed: false };
    if (current.status === status) return { found: true, changed: false };

    const now = Date.now();
    tx.update(applications)
      .set({ status, updatedAt: now })
      .where(eq(applications.id, id))
      .run();
    tx.insert(statusHistory)
      .values({
        applicationId: id,
        fromStatus: current.status,
        toStatus: status,
        changedAt: now,
      })
      .run();
    return { found: true, changed: true };
  });
}

export function removeApplication(id: number, database: AppDatabase = db) {
  return database.transaction((tx) => {
    const removed = tx.delete(applications).where(eq(applications.id, id)).run().changes > 0;
    if (removed) {
      tx.delete(tags)
        .where(
          notExists(
            tx
              .select({ tagId: applicationTags.tagId })
              .from(applicationTags)
              .where(eq(applicationTags.tagId, tags.id)),
          ),
        )
        .run();
    }
    return removed;
  });
}

export function listQuickFiles(database: AppDatabase = db) {
  return database.select().from(quickFiles).orderBy(desc(quickFiles.createdAt)).all();
}

export function findQuickFile(id: number, database: AppDatabase = db) {
  return database.select().from(quickFiles).where(eq(quickFiles.id, id)).get();
}

export function addQuickFile(
  input: { originalName: string; storedName: string; mimeType: string; size: number },
  database: AppDatabase = db,
) {
  return database.insert(quickFiles).values({ ...input, createdAt: Date.now() }).returning().get();
}

export function removeQuickFile(id: number, database: AppDatabase = db) {
  const file = findQuickFile(id, database);
  if (!file) return undefined;
  database.delete(quickFiles).where(eq(quickFiles.id, id)).run();
  return file;
}
