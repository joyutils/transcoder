import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  thumbnailJobId: text("thumbnail_job_id").notNull(),
  mediaJobId: text("media_job_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .$onUpdate(() => sql`(current_timestamp)`),
});

export const videosRelations = relations(videos, ({ one }) => ({
  thumbnailJob: one(jobs, {
    fields: [videos.thumbnailJobId],
    references: [jobs.id],
  }),
  mediaJob: one(jobs, {
    fields: [videos.mediaJobId],
    references: [jobs.id],
  }),
}));

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .references(() => videos.id)
    .notNull(),
  fileName: text("file_name").notNull(),
  originalFileSize: integer("file_size").notNull(),
  processedFileSize: integer("processed_file_size"),
  fileType: text("file_type", { enum: ["media", "thumbnail"] }).notNull(),
  status: text("status", {
    enum: [
      "processing",
      "hashing",
      "creating_asset",
      "uploading",
      "completed",
      "failed",
    ],
  })
    .notNull()
    .default("processing"),
  hash: text("hash"),
  dataObjectId: text("data_object_id"),
  duration: integer("duration"),
  height: integer("height"),
  width: integer("width"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`)
    .$onUpdate(() => sql`(current_timestamp)`),
});

export const jobsRelations = relations(jobs, ({ one }) => ({
  video: one(videos, {
    fields: [jobs.videoId],
    references: [videos.id],
  }),
}));

export type DbVideo = typeof videos.$inferSelect;
export type DbJob = typeof jobs.$inferSelect;
export type JobStatus = DbJob["status"];
