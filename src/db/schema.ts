import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { APPLICATION_STATUSES } from "@/lib/status";
import { WORK_MODES } from "@/lib/work-mode";

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    company: text("company").notNull(),
    title: text("title").notNull(),
    offerUrl: text("offer_url"),
    location: text("location"),
    cityCode: text("city_code"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    workMode: text("work_mode", { enum: WORK_MODES }).notNull().default("unspecified"),
    applicationDate: text("application_date").notNull(),
    status: text("status", { enum: APPLICATION_STATUSES }).notNull().default("applied"),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("applications_status_idx").on(table.status),
    index("applications_date_idx").on(table.applicationDate),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("tags_normalized_name_unique").on(table.normalizedName)],
);

export const applicationTags = sqliteTable(
  "application_tags",
  {
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.applicationId, table.tagId] }),
    index("application_tags_tag_idx").on(table.tagId),
  ],
);

export const statusHistory = sqliteTable(
  "status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: text("from_status", { enum: APPLICATION_STATUSES }),
    toStatus: text("to_status", { enum: APPLICATION_STATUSES }).notNull(),
    changedAt: integer("changed_at").notNull(),
  },
  (table) => [index("status_history_application_idx").on(table.applicationId)],
);

export const applicationDocuments = sqliteTable(
  "application_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("application_documents_application_idx").on(table.applicationId)],
);

export type Application = typeof applications.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type StatusHistoryEntry = typeof statusHistory.$inferSelect;
export type ApplicationDocument = typeof applicationDocuments.$inferSelect;

export const applicationFollowUps = sqliteTable("application_follow_ups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("application_follow_ups_application_idx").on(table.applicationId), index("application_follow_ups_date_idx").on(table.date)]);

export type ApplicationFollowUp = typeof applicationFollowUps.$inferSelect;

export const quickFiles = sqliteTable("quick_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type QuickFile = typeof quickFiles.$inferSelect;
