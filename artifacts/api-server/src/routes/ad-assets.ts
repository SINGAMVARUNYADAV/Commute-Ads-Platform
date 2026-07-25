import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adAssetsTable } from "@workspace/db";
import {
  ListAdAssetsQueryParams,
  ListAdAssetsResponse,
  CreateAdAssetBody,
  CreateAdAssetResponse,
  GetAdAssetParams,
  GetAdAssetResponse,
  ApproveAdAssetParams,
  ApproveAdAssetResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ad-assets", async (req, res): Promise<void> => {
  const query = ListAdAssetsQueryParams.safeParse(req.query);
  let rows = await db.select().from(adAssetsTable).orderBy(adAssetsTable.createdAt);

  if (query.success && query.data.campaign_id) {
    rows = rows.filter((a) => a.campaignId === query.data.campaign_id);
  }

  res.json(ListAdAssetsResponse.parse(rows));
});

router.post("/ad-assets", async (req, res): Promise<void> => {
  const parsed = CreateAdAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [asset] = await db.insert(adAssetsTable).values(parsed.data).returning();
  res.status(201).json(CreateAdAssetResponse.parse(asset));
});

router.get("/ad-assets/:id", async (req, res): Promise<void> => {
  const params = GetAdAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [asset] = await db.select().from(adAssetsTable).where(eq(adAssetsTable.id, params.data.id));
  if (!asset) {
    res.status(404).json({ error: "Ad asset not found" });
    return;
  }

  res.json(GetAdAssetResponse.parse(asset));
});

router.post("/ad-assets/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveAdAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [asset] = await db
    .update(adAssetsTable)
    .set({ isApproved: true })
    .where(eq(adAssetsTable.id, params.data.id))
    .returning();

  if (!asset) {
    res.status(404).json({ error: "Ad asset not found" });
    return;
  }

  res.json(ApproveAdAssetResponse.parse(asset));
});

export default router;
