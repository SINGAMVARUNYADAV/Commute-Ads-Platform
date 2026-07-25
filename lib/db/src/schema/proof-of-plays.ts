import { pgTable, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { devicesTable } from "./devices";
import { adAssetsTable } from "./ad-assets";

export const proofOfPlaysTable = pgTable("proof_of_plays", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devicesTable.id),
  adAssetId: integer("ad_asset_id").notNull().references(() => adAssetsTable.id),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  passengerVerified: boolean("passenger_verified").notNull().default(false),
});

export const insertProofOfPlaySchema = createInsertSchema(proofOfPlaysTable).omit({ id: true });
export type InsertProofOfPlay = z.infer<typeof insertProofOfPlaySchema>;
export type ProofOfPlay = typeof proofOfPlaysTable.$inferSelect;
