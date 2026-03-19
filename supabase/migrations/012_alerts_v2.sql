-- ============================================================
-- 012_alerts_v2.sql — Alerts v2: new types, delivery config, digests
-- ============================================================

-- Extend notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'post_now';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trend_dying';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'meme_worthy';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'saturated_trend';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'risky_trend';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'urgent_trend';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'morning_digest';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'evening_digest';

-- Extend alert_trigger_type enum
ALTER TYPE alert_trigger_type ADD VALUE IF NOT EXISTS 'post_now';
ALTER TYPE alert_trigger_type ADD VALUE IF NOT EXISTS 'trend_dying';
ALTER TYPE alert_trigger_type ADD VALUE IF NOT EXISTS 'meme_worthy';
ALTER TYPE alert_trigger_type ADD VALUE IF NOT EXISTS 'saturated';
ALTER TYPE alert_trigger_type ADD VALUE IF NOT EXISTS 'risky';
ALTER TYPE alert_trigger_type ADD VALUE IF NOT EXISTS 'digest';

-- Add delivery config columns to alert_rules
ALTER TABLE alert_rules
  ADD COLUMN IF NOT EXISTS notify_in_app  bool    NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email   bool    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_url    text,
  ADD COLUMN IF NOT EXISTS description    text;

-- Digests table: stores generated morning/evening digests
CREATE TABLE IF NOT EXISTS digests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('morning', 'evening')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digests_org_created ON digests(org_id, created_at DESC);

ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_digests"
  ON digests FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "service_role_manage_digests"
  ON digests FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
