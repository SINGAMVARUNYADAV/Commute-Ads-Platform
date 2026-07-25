import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sosAlertsTable, devicesTable } from "@workspace/db";
import {
  CreateSosAlertBody,
  CreateSosAlertResponse,
  ListSosAlertsQueryParams,
  ListSosAlertsResponse,
  ResolveSosAlertParams,
  ResolveSosAlertResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatAlert(a: typeof sosAlertsTable.$inferSelect, nodeCode?: string | null) {
  return {
    id: a.id,
    deviceId: a.deviceId,
    alertType: a.alertType,
    latitude: a.latitude,
    longitude: a.longitude,
    timestamp: a.timestamp.toISOString(),
    status: a.status,
    nodeCode: nodeCode ?? null,
  };
}

router.post("/sos", async (req, res): Promise<void> => {
  const parsed = CreateSosAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [alert] = await db
    .insert(sosAlertsTable)
    .values({
      deviceId: parsed.data.deviceId,
      alertType: parsed.data.alertType,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    })
    .returning();

  // Mark device as having an SOS alert
  await db.update(devicesTable).set({ hasSosAlert: true }).where(eq(devicesTable.id, parsed.data.deviceId));

  // Get device nodeCode for response
  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, parsed.data.deviceId));

  res.status(201).json(CreateSosAlertResponse.parse(formatAlert(alert, device?.nodeCode)));
});

router.get("/sos-alerts", async (req, res): Promise<void> => {
  const query = ListSosAlertsQueryParams.safeParse(req.query);

  const rows = await db
    .select({
      id: sosAlertsTable.id,
      deviceId: sosAlertsTable.deviceId,
      alertType: sosAlertsTable.alertType,
      latitude: sosAlertsTable.latitude,
      longitude: sosAlertsTable.longitude,
      timestamp: sosAlertsTable.timestamp,
      status: sosAlertsTable.status,
      nodeCode: devicesTable.nodeCode,
    })
    .from(sosAlertsTable)
    .leftJoin(devicesTable, eq(sosAlertsTable.deviceId, devicesTable.id))
    .orderBy(sosAlertsTable.timestamp);

  let formatted = rows.map((a) => ({ ...a, timestamp: a.timestamp.toISOString() }));

  if (query.success && query.data.status) {
    formatted = formatted.filter((a) => a.status === query.data.status);
  }

  res.json(ListSosAlertsResponse.parse(formatted));
});

router.post("/sos-alerts/:id/resolve", async (req, res): Promise<void> => {
  const params = ResolveSosAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .update(sosAlertsTable)
    .set({ status: "RESOLVED" })
    .where(eq(sosAlertsTable.id, params.data.id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "SOS alert not found" });
    return;
  }

  // Check if device has any remaining pending alerts; if not, clear the flag
  const pendingAlerts = await db
    .select()
    .from(sosAlertsTable)
    .where(eq(sosAlertsTable.deviceId, alert.deviceId));

  const hasPending = pendingAlerts.some((a) => a.status === "PENDING" && a.id !== alert.id);
  if (!hasPending) {
    await db.update(devicesTable).set({ hasSosAlert: false }).where(eq(devicesTable.id, alert.deviceId));
  }

  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, alert.deviceId));

  res.json(ResolveSosAlertResponse.parse(formatAlert(alert, device?.nodeCode)));
});

export default router;
