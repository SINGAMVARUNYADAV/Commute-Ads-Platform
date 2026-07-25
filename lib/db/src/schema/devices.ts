import { pgTable, serial, text, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  nodeCode: text("node_code").notNull().unique(),
  batteryPct: integer("battery_pct").notNull().default(100),
  isCharging: boolean("is_charging").notNull().default(false),
  chargingModeStatus: text("charging_mode_status").notNull().default("NORMAL"),
  signalDbm: integer("signal_dbm").notNull().default(-70),
  currentLat: real("current_lat").notNull().default(17.385),
  currentLng: real("current_lng").notNull().default(78.4867),
  currentlyPlaying: text("currently_playing"),
  screenStatus: text("screen_status").notNull().default("ACTIVE"),
  lastPing: timestamp("last_ping", { withTimezone: true }).notNull().defaultNow(),
  firmwareVersion: text("firmware_version").notNull().default("v2.1.0"),
  hasSosAlert: boolean("has_sos_alert").default(false),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({ id: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
