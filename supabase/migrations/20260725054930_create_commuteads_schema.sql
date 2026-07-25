/*
# Create CommuteAds Platform schema (single-tenant, no auth)

1. Overview
   This migration creates the full data layer for the CommuteAds DOOH
   (digital-out-of-home) platform. It is a single-tenant app with NO
   sign-in screen, so every table is readable/writable by the anon and
   authenticated roles (the frontend and API server talk to Supabase
   using the anon key). There are no user_id columns and no foreign keys
   to auth.users.

2. New Tables
   - `devices` — one row per in-cab display node. Tracks battery, signal,
     GPS coordinates, screen status, what it is currently playing, and a
     flag for active SOS alerts.
       * id (serial PK), node_code (unique text), battery_pct (int),
         is_charging (bool), charging_mode_status (text), signal_dbm (int),
         current_lat (real), current_lng (real), currently_playing (text),
         screen_status (text), last_ping (timestamptz),
         firmware_version (text), has_sos_alert (bool).
   - `campaigns` — advertising campaigns with pacing targets.
       * id (serial PK), advertiser_id (int), name (text),
         target_fleet_tier (text), total_target_impressions (int),
         delivered_impressions (int), start_date (date),
         end_date (date), daily_cap (int), status (text), created_at (timestamptz).
   - `ad_assets` — creative videos belonging to a campaign.
       * id (serial PK), campaign_id (int FK -> campaigns.id),
         title (text), video_url (text), duration_sec (int),
         is_approved (bool), created_at (timestamptz).
   - `dynamic_content` — news / weather / breaking-alert cards.
       * id (serial PK), content_type (text), headline (text),
         body_text (text), icon_url (text), location_tag (text),
         valid_until (timestamptz), created_at (timestamptz).
   - `proof_of_plays` — impression log: each time an ad played on a device.
       * id (serial PK), device_id (int FK -> devices.id),
         ad_asset_id (int FK -> ad_assets.id), played_at (timestamptz),
         latitude (real), longitude (real), passenger_verified (bool).
   - `sos_alerts` — emergency alerts raised by a device.
       * id (serial PK), device_id (int FK -> devices.id),
         alert_type (text), latitude (real), longitude (real),
         timestamp (timestamptz), status (text).

3. Indexes
   - devices(last_ping) — dashboard freshness checks.
   - devices(screen_status) — fleet status breakdown.
   - campaigns(status) — list filtering.
   - ad_assets(campaign_id) — lookup by campaign.
   - proof_of_plays(played_at) — impression timeline aggregation.
   - proof_of_plays(device_id) — per-device history.
   - sos_alerts(status) — pending-alert dashboard badge.
   - sos_alerts(device_id) — device alert lookup.
   - dynamic_content(content_type) — content filtering.

4. Security (RLS)
   - RLS enabled on every table.
   - Because this is a single-tenant app with no sign-in, each table gets
     four policies (SELECT/INSERT/UPDATE/DELETE) scoped to
     `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`.
     The data is intentionally shared/public across the platform.
   - No ownership checks are needed because there are no per-user rows.
*/

-- devices ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id serial PRIMARY KEY,
  node_code text NOT NULL UNIQUE,
  battery_pct integer NOT NULL DEFAULT 100,
  is_charging boolean NOT NULL DEFAULT false,
  charging_mode_status text NOT NULL DEFAULT 'NORMAL',
  signal_dbm integer NOT NULL DEFAULT -70,
  current_lat real NOT NULL DEFAULT 17.385,
  current_lng real NOT NULL DEFAULT 78.4867,
  currently_playing text,
  screen_status text NOT NULL DEFAULT 'ACTIVE',
  last_ping timestamptz NOT NULL DEFAULT now(),
  firmware_version text NOT NULL DEFAULT 'v2.1.0',
  has_sos_alert boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_devices_last_ping ON devices(last_ping);
CREATE INDEX IF NOT EXISTS idx_devices_screen_status ON devices(screen_status);
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_devices" ON devices;
CREATE POLICY "anon_select_devices" ON devices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_devices" ON devices;
CREATE POLICY "anon_insert_devices" ON devices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_devices" ON devices;
CREATE POLICY "anon_update_devices" ON devices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_devices" ON devices;
CREATE POLICY "anon_delete_devices" ON devices FOR DELETE TO anon, authenticated USING (true);

-- campaigns --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id serial PRIMARY KEY,
  advertiser_id integer NOT NULL,
  name text NOT NULL,
  target_fleet_tier text NOT NULL DEFAULT 'PREMIUM',
  total_target_impressions integer NOT NULL DEFAULT 100000,
  delivered_impressions integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  daily_cap integer NOT NULL DEFAULT 3000,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_campaigns" ON campaigns;
CREATE POLICY "anon_select_campaigns" ON campaigns FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_campaigns" ON campaigns;
CREATE POLICY "anon_insert_campaigns" ON campaigns FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_campaigns" ON campaigns;
CREATE POLICY "anon_update_campaigns" ON campaigns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_campaigns" ON campaigns;
CREATE POLICY "anon_delete_campaigns" ON campaigns FOR DELETE TO anon, authenticated USING (true);

-- ad_assets --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_assets (
  id serial PRIMARY KEY,
  campaign_id integer NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text NOT NULL,
  duration_sec integer NOT NULL DEFAULT 30,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_assets_campaign_id ON ad_assets(campaign_id);
ALTER TABLE ad_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_ad_assets" ON ad_assets;
CREATE POLICY "anon_select_ad_assets" ON ad_assets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ad_assets" ON ad_assets;
CREATE POLICY "anon_insert_ad_assets" ON ad_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ad_assets" ON ad_assets;
CREATE POLICY "anon_update_ad_assets" ON ad_assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ad_assets" ON ad_assets;
CREATE POLICY "anon_delete_ad_assets" ON ad_assets FOR DELETE TO anon, authenticated USING (true);

-- dynamic_content --------------------------------------------------------
CREATE TABLE IF NOT EXISTS dynamic_content (
  id serial PRIMARY KEY,
  content_type text NOT NULL,
  headline text NOT NULL,
  body_text text NOT NULL,
  icon_url text,
  location_tag text NOT NULL DEFAULT 'Hyderabad',
  valid_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_content_type ON dynamic_content(content_type);
ALTER TABLE dynamic_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_dynamic_content" ON dynamic_content;
CREATE POLICY "anon_select_dynamic_content" ON dynamic_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dynamic_content" ON dynamic_content;
CREATE POLICY "anon_insert_dynamic_content" ON dynamic_content FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dynamic_content" ON dynamic_content;
CREATE POLICY "anon_update_dynamic_content" ON dynamic_content FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dynamic_content" ON dynamic_content;
CREATE POLICY "anon_delete_dynamic_content" ON dynamic_content FOR DELETE TO anon, authenticated USING (true);

-- proof_of_plays ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS proof_of_plays (
  id serial PRIMARY KEY,
  device_id integer NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  ad_asset_id integer NOT NULL REFERENCES ad_assets(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  latitude real NOT NULL,
  longitude real NOT NULL,
  passenger_verified boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_proof_of_plays_played_at ON proof_of_plays(played_at);
CREATE INDEX IF NOT EXISTS idx_proof_of_plays_device_id ON proof_of_plays(device_id);
ALTER TABLE proof_of_plays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_proof_of_plays" ON proof_of_plays;
CREATE POLICY "anon_select_proof_of_plays" ON proof_of_plays FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_proof_of_plays" ON proof_of_plays;
CREATE POLICY "anon_insert_proof_of_plays" ON proof_of_plays FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_proof_of_plays" ON proof_of_plays;
CREATE POLICY "anon_update_proof_of_plays" ON proof_of_plays FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_proof_of_plays" ON proof_of_plays;
CREATE POLICY "anon_delete_proof_of_plays" ON proof_of_plays FOR DELETE TO anon, authenticated USING (true);

-- sos_alerts -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sos_alerts (
  id serial PRIMARY KEY,
  device_id integer NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  latitude real NOT NULL,
  longitude real NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_device_id ON sos_alerts(device_id);
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sos_alerts" ON sos_alerts;
CREATE POLICY "anon_select_sos_alerts" ON sos_alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sos_alerts" ON sos_alerts;
CREATE POLICY "anon_insert_sos_alerts" ON sos_alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sos_alerts" ON sos_alerts;
CREATE POLICY "anon_update_sos_alerts" ON sos_alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sos_alerts" ON sos_alerts;
CREATE POLICY "anon_delete_sos_alerts" ON sos_alerts FOR DELETE TO anon, authenticated USING (true);
