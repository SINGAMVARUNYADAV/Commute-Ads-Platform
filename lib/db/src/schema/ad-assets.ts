import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";

export const adAssetsTable = pgTable("ad_assets", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(),
  durationSec: integer("duration_sec").notNull().default(30),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdAssetSchema = createInsertSchema(adAssetsTable).omit({ id: true, createdAt: true });
export type InsertAdAsset = z.infer<typeof insertAdAssetSchema>;
export type AdAsset = typeof adAssetsTable.$inferSelect;
