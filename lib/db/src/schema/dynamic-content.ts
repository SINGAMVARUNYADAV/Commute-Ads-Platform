import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dynamicContentTable = pgTable("dynamic_content", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(),
  headline: text("headline").notNull(),
  bodyText: text("body_text").notNull(),
  iconUrl: text("icon_url"),
  locationTag: text("location_tag").notNull().default("Hyderabad"),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDynamicContentSchema = createInsertSchema(dynamicContentTable).omit({ id: true, createdAt: true });
export type InsertDynamicContent = z.infer<typeof insertDynamicContentSchema>;
export type DynamicContent = typeof dynamicContentTable.$inferSelect;
