import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";
import { SubmitTelemetryBody, SubmitTelemetryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/telemetry", async (req, res): Promise<void> => {
  const parsed = SubmitTelemetryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { deviceId, batteryPct, isCharging, signalDbm, currentLat, currentLng, currentlyPlaying, screenStatus } = parsed.data;

  // Determine smart charging mode status
  let chargingModeStatus = "NORMAL";
  if (isCharging && batteryPct >= 80) {
    chargingModeStatus = "PAUSED_AT_80";
  } else if (!isCharging && batteryPct < 50) {
    chargingModeStatus = "CHARGING_BELOW_50";
  }

  const [device] = await db
    .update(devicesTable)
    .set({
      batteryPct,
      isCharging,
      chargingModeStatus,
      signalDbm,
      currentLat,
      currentLng,
      currentlyPlaying: currentlyPlaying ?? null,
      screenStatus: screenStatus ?? "ACTIVE",
      lastPing: new Date(),
    })
    .where(eq(devicesTable.id, deviceId))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(SubmitTelemetryResponse.parse({ success: true, deviceId }));
});

export default router;
