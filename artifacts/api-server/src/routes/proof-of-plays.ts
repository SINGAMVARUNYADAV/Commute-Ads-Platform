import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, proofOfPlaysTable, adAssetsTable, campaignsTable } from "@workspace/db";
import {
  ListProofOfPlaysQueryParams,
  ListProofOfPlaysResponse,
  CreateProofOfPlayBody,
  CreateProofOfPlayResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/proof-of-plays", async (req, res): Promise<void> => {
  const query = ListProofOfPlaysQueryParams.safeParse(req.query);

  let rows = await db.select().from(proofOfPlaysTable).orderBy(proofOfPlaysTable.playedAt);

  if (query.success && query.data.device_id) {
    rows = rows.filter((p) => p.deviceId === query.data.device_id);
  }

  const formatted = rows.map((p) => ({
    ...p,
    playedAt: p.playedAt.toISOString(),
  }));

  res.json(ListProofOfPlaysResponse.parse(formatted));
});

router.post("/proof-of-plays", async (req, res): Promise<void> => {
  const parsed = CreateProofOfPlayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pop] = await db
    .insert(proofOfPlaysTable)
    .values({
      deviceId: parsed.data.deviceId,
      adAssetId: parsed.data.adAssetId,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      passengerVerified: parsed.data.passengerVerified ?? false,
    })
    .returning();

  // Update campaign delivered impressions count
  const [asset] = await db
    .select()
    .from(adAssetsTable)
    .where(eq(adAssetsTable.id, parsed.data.adAssetId));

  if (asset) {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(proofOfPlaysTable)
      .where(
        sql`ad_asset_id in (select id from ad_assets where campaign_id = ${asset.campaignId})`
      );
    await db
      .update(campaignsTable)
      .set({ deliveredImpressions: countRow.count })
      .where(eq(campaignsTable.id, asset.campaignId));
  }

  res.status(201).json(
    CreateProofOfPlayResponse.parse({ ...pop, playedAt: pop.playedAt.toISOString() })
  );
});

export default router;
