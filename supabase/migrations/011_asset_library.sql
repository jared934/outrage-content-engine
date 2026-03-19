-- ============================================================
-- 011_asset_library.sql — Asset Library enhancements
-- ============================================================

-- Add semantic category column (logo, overlay, watermark, etc.)
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS description text;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(org_id, category);

-- ============================================================
-- Supabase Storage bucket for org assets
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-assets',
  'org-assets',
  true,
  52428800,           -- 50 MB per file
  null                -- all mime types allowed
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can read all objects in their org folder
CREATE POLICY "org_members_read_org_assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'org-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Storage RLS: org editors/admins can upload to their org folder
CREATE POLICY "editors_upload_org_assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor','member')
    )
  );

-- Storage RLS: org editors/admins can delete their org assets
CREATE POLICY "editors_delete_org_assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

-- Storage RLS: service role bypass
CREATE POLICY "service_role_manage_org_assets"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'org-assets')
  WITH CHECK (bucket_id = 'org-assets');
