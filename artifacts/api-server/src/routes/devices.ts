import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";
import {
  ListDevicesQueryParams,
  ListDevicesResponse,
  CreateDeviceBody,
  CreateDeviceResponse,
  GetDeviceParams,
  GetDeviceResponse,
  UpdateDeviceParams,
  UpdateDeviceBody,
  UpdateDeviceResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/devices", async (req, res): Promise<void> => {
  const query = ListDevicesQueryParams.safeParse(req.query);
  let rows = await db.select().from(devicesTable).orderBy(devicesTable.nodeCode);

  if (query.success && query.data.status) {
    rows = rows.filter((d) => d.screenStatus === query.data.status);
  }

  const formatted = rows.map((d) => ({
    ...d,
    lastPing: d.lastPing.toISOString(),
  }));

  res.json(ListDevicesResponse.parse(formatted));
});

router.post("/devices", async (req, res): Promise<void> => {
  const parsed = CreateDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [device] = await db
    .insert(devicesTable)
    .values({
      nodeCode: parsed.data.nodeCode,
      firmwareVersion: parsed.data.firmwareVersion,
      currentLat: parsed.data.currentLat ?? 17.385,
      currentLng: parsed.data.currentLng ?? 78.4867,
    })
    .returning();

  res.status(201).json(CreateDeviceResponse.parse({ ...device, lastPing: device.lastPing.toISOString() }));
});

router.get("/devices/:id", async (req, res): Promise<void> => {
  const params = GetDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, params.data.id));
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(GetDeviceResponse.parse({ ...device, lastPing: device.lastPing.toISOString() }));
});

router.patch("/devices/:id", async (req, res): Promise<void> => {
  const params = UpdateDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.screenStatus !== undefined) updates.screenStatus = parsed.data.screenStatus;
  if (parsed.data.firmwareVersion !== undefined) updates.firmwareVersion = parsed.data.firmwareVersion;

  const [device] = await db
    .update(devicesTable)
    .set(updates)
    .where(eq(devicesTable.id, params.data.id))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(UpdateDeviceResponse.parse({ ...device, lastPing: device.lastPing.toISOString() }));
});

export default router;
