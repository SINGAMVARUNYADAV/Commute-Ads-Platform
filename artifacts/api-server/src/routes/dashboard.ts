import { Router, type IRouter } from "express";
import { db, devicesTable, campaignsTable, sosAlertsTable, proofOfPlaysTable } from "@workspace/db";
import { sql, eq, and, gte } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetFleetStatusResponse,
  GetImpressionTimelineResponse,
  GetRecentAlertsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [deviceStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where screen_status = 'ACTIVE')::int`,
      standby: sql<number>`count(*) filter (where screen_status = 'STANDBY')::int`,
      sos: sql<number>`count(*) filter (where has_sos_alert = true)::int`,
    })
    .from(devicesTable);

  const [campaignStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'ACTIVE')::int`,
      totalDelivered: sql<number>`coalesce(sum(delivered_impressions), 0)::int`,
      totalTarget: sql<number>`coalesce(sum(total_target_impressions), 0)::int`,
    })
    .from(campaignsTable);

  const [sosStats] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(sosAlertsTable)
    .where(eq(sosAlertsTable.status, "PENDING"));

  // offline = devices with last_ping older than 5 minutes
  const [offlineStats] = await db
    .select({ offline: sql<number>`count(*)::int` })
    .from(devicesTable)
    .where(sql`last_ping < now() - interval '5 minutes'`);

  const summary = {
    totalDevices: deviceStats.total,
    activeDevices: deviceStats.active,
    offlineDevices: offlineStats.offline,
    sosDevices: deviceStats.sos,
    totalCampaigns: campaignStats.total,
    activeCampaigns: campaignStats.active,
    totalImpressionsDelivered: campaignStats.totalDelivered,
    totalImpressionsTarget: campaignStats.totalTarget,
    pendingSosAlerts: sosStats.pending,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/fleet-status", async (req, res): Promise<void> => {
  const [stats] = await db
    .select({
      active: sql<number>`count(*) filter (where screen_status = 'ACTIVE' and has_sos_alert is not true)::int`,
      standby: sql<number>`count(*) filter (where screen_status = 'STANDBY' and has_sos_alert is not true)::int`,
      offline: sql<number>`count(*) filter (where last_ping < now() - interval '5 minutes')::int`,
      sos: sql<number>`count(*) filter (where has_sos_alert = true)::int`,
    })
    .from(devicesTable);

  res.json(GetFleetStatusResponse.parse({
    active: stats.active,
    standby: stats.standby,
    offline: stats.offline,
    sos: stats.sos,
  }));
});

router.get("/dashboard/impression-timeline", async (req, res): Promise<void> => {
  // Generate last 30 days of impression data from proof_of_plays
  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', played_at)::date::text`,
      impressions: sql<number>`count(*)::int`,
    })
    .from(proofOfPlaysTable)
    .where(gte(proofOfPlaysTable.playedAt, sql`now() - interval '30 days'`))
    .groupBy(sql`date_trunc('day', played_at)::date`)
    .orderBy(sql`date_trunc('day', played_at)::date`);

  res.json(GetImpressionTimelineResponse.parse(rows));
});

router.get("/dashboard/recent-alerts", async (req, res): Promise<void> => {
  const alerts = await db
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
    .orderBy(sql`${sosAlertsTable.timestamp} desc`)
    .limit(10);

  const formatted = alerts.map((a) => ({
    ...a,
    timestamp: a.timestamp.toISOString(),
  }));

  res.json(GetRecentAlertsResponse.parse(formatted));
});

export default router;
