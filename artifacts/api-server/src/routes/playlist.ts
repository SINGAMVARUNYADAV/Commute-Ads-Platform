import { Router, type IRouter } from "express";
import { eq, and, lte, gte } from "drizzle-orm";
import { db, devicesTable, campaignsTable, adAssetsTable, dynamicContentTable } from "@workspace/db";
import { GetDevicePlaylistQueryParams, GetDevicePlaylistResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/device/playlist", async (req, res): Promise<void> => {
  const query = GetDevicePlaylistQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const deviceId = query.data.device_id;
  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  // Get active campaigns and their approved ad assets
  const activeCampaigns = await db
    .select()
    .from(campaignsTable)
    .where(
      and(
        eq(campaignsTable.status, "ACTIVE"),
        lte(campaignsTable.startDate, today),
        gte(campaignsTable.endDate, today)
      )
    );

  const allAdItems: Array<{ type: "AD"; id: number; title: string; videoUrl: string | null; durationSec: number; campaignId: number; weight: number }> = [];

  for (const campaign of activeCampaigns) {
    const assets = await db
      .select()
      .from(adAssetsTable)
      .where(and(eq(adAssetsTable.campaignId, campaign.id), eq(adAssetsTable.isApproved, true)));

    // Smart pacing: calculate required daily impressions
    const totalDays = Math.max(1, (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000);
    const daysRemaining = Math.max(1, (new Date(campaign.endDate).getTime() - Date.now()) / 86400000);
    const requiredDaily = Math.ceil((campaign.totalTargetImpressions - campaign.deliveredImpressions) / daysRemaining);
    const expectedDaily = campaign.totalTargetImpressions / totalDays;

    // Weight: behind schedule → inject more (weight > 1), on track → weight = 1
    const weight = Math.min(3, Math.max(1, Math.ceil(requiredDaily / Math.max(1, expectedDaily))));

    for (const asset of assets) {
      allAdItems.push({
        type: "AD",
        id: asset.id,
        title: asset.title,
        videoUrl: asset.videoUrl,
        durationSec: asset.durationSec,
        campaignId: campaign.id,
        weight,
      });
    }
  }

  // Get active dynamic content
  const now = new Date();
  const dynamicItems = await db
    .select()
    .from(dynamicContentTable)
    .where(gte(dynamicContentTable.validUntil, now));

  // Build playlist: [AD] → [HOURLY_NEWS] → [AD] → [WEATHER] → [AD]
  const playlist: Array<{ type: string; id: number; title: string; videoUrl: string | null; durationSec: number; order: number; campaignId: number | null }> = [];
  let order = 0;

  const weatherItems = dynamicItems.filter((d) => d.contentType === "WEATHER_CARD");
  const newsItems = dynamicItems.filter((d) => d.contentType === "NEWS_CARD");
  const breakingAlerts = dynamicItems.filter((d) => d.contentType === "BREAKING_ALERT");

  // Breaking alerts always go first
  for (const alert of breakingAlerts) {
    playlist.push({ type: "BREAKING_ALERT", id: alert.id, title: alert.headline, videoUrl: null, durationSec: 15, order: order++, campaignId: null });
  }

  // Build weighted ad pool
  const adPool: typeof allAdItems = [];
  for (const item of allAdItems) {
    for (let i = 0; i < item.weight; i++) {
      adPool.push(item);
    }
  }

  // Interleave: AD → NEWS → AD → WEATHER → AD pattern
  let adIdx = 0;
  let newsIdx = 0;
  let weatherIdx = 0;
  const totalSlots = Math.max(adPool.length * 2, 9);

  for (let i = 0; i < totalSlots; i++) {
    const slot = i % 5;
    if (slot === 1 && newsItems.length > 0) {
      const news = newsItems[newsIdx % newsItems.length];
      playlist.push({ type: "NEWS_CARD", id: news.id, title: news.headline, videoUrl: null, durationSec: 10, order: order++, campaignId: null });
      newsIdx++;
    } else if (slot === 3 && weatherItems.length > 0) {
      const weather = weatherItems[weatherIdx % weatherItems.length];
      playlist.push({ type: "WEATHER_CARD", id: weather.id, title: weather.headline, videoUrl: null, durationSec: 10, order: order++, campaignId: null });
      weatherIdx++;
    } else if (adPool.length > 0) {
      const ad = adPool[adIdx % adPool.length];
      playlist.push({ type: "AD", id: ad.id, title: ad.title, videoUrl: ad.videoUrl, durationSec: ad.durationSec, order: order++, campaignId: ad.campaignId });
      adIdx++;
    }
  }

  res.json(GetDevicePlaylistResponse.parse(playlist));
});

export default router;
