import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, campaignsTable } from "@workspace/db";
import {
  ListCampaignsQueryParams,
  ListCampaignsResponse,
  CreateCampaignBody,
  CreateCampaignResponse,
  GetCampaignParams,
  GetCampaignResponse,
  UpdateCampaignParams,
  UpdateCampaignBody,
  UpdateCampaignResponse,
  ApproveCampaignParams,
  ApproveCampaignResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function computePacing(campaign: { deliveredImpressions: number; totalTargetImpressions: number; startDate: string; endDate: string }): number | null {
  const totalDays = Math.max(1, (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000);
  const elapsed = Math.max(0, (Date.now() - new Date(campaign.startDate).getTime()) / 86400000);
  const expectedByNow = (elapsed / totalDays) * campaign.totalTargetImpressions;
  if (expectedByNow <= 0) return null;
  return Math.round((campaign.deliveredImpressions / expectedByNow) * 100);
}

function formatCampaign(c: typeof campaignsTable.$inferSelect) {
  return {
    id: c.id,
    advertiserId: c.advertiserId,
    name: c.name,
    targetFleetTier: c.targetFleetTier,
    totalTargetImpressions: c.totalTargetImpressions,
    deliveredImpressions: c.deliveredImpressions,
    startDate: c.startDate,
    endDate: c.endDate,
    dailyCap: c.dailyCap,
    status: c.status,
    pacingPercent: computePacing(c),
  };
}

router.get("/campaigns", async (req, res): Promise<void> => {
  const query = ListCampaignsQueryParams.safeParse(req.query);
  let rows = await db.select().from(campaignsTable).orderBy(campaignsTable.createdAt);

  if (query.success && query.data.status) {
    rows = rows.filter((c) => c.status === query.data.status);
  }

  res.json(ListCampaignsResponse.parse(rows.map(formatCampaign)));
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      advertiserId: parsed.data.advertiserId,
      name: parsed.data.name,
      targetFleetTier: parsed.data.targetFleetTier,
      totalTargetImpressions: parsed.data.totalTargetImpressions,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      dailyCap: parsed.data.dailyCap,
    })
    .returning();

  res.status(201).json(CreateCampaignResponse.parse(formatCampaign(campaign)));
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(GetCampaignResponse.parse(formatCampaign(campaign)));
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.targetFleetTier !== undefined) updates.targetFleetTier = parsed.data.targetFleetTier;
  if (parsed.data.totalTargetImpressions !== undefined) updates.totalTargetImpressions = parsed.data.totalTargetImpressions;
  if (parsed.data.startDate !== undefined) updates.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updates.endDate = parsed.data.endDate;
  if (parsed.data.dailyCap !== undefined) updates.dailyCap = parsed.data.dailyCap;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const [campaign] = await db
    .update(campaignsTable)
    .set(updates)
    .where(eq(campaignsTable.id, params.data.id))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(UpdateCampaignResponse.parse(formatCampaign(campaign)));
});

router.post("/campaigns/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .update(campaignsTable)
    .set({ status: "ACTIVE" })
    .where(eq(campaignsTable.id, params.data.id))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(ApproveCampaignResponse.parse(formatCampaign(campaign)));
});

export default router;
