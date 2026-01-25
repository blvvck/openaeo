BEGIN;

DO $$
DECLARE
  tenant_table text;
  tenant_tables text[] := ARRAY[
    'alert_channels', 'alert_history', 'alert_rules', 'analytics', 'bot_visits',
    'brand_aliases', 'brand_config', 'competitors', 'experiment_results',
    'experiment_variants', 'experiments', 'export_backup_config',
    'intelligence_searches', 'notification_preferences', 'personas',
    'platform_settings', 'priority_queue_settings', 'prompt_performance_metrics',
    'prompt_priority_queue', 'prompt_schedule_links', 'prompt_tags',
    'prompt_template_versions', 'prompt_templates', 'prompt_variants', 'prompts',
    'quality_aggregates', 'quality_anomalies', 'refresh_history',
    'refresh_scheduling_settings', 'request_queue', 'response_quality_scores',
    'responses', 'scan_schedules', 'scrape_attempts', 'settings_audit_log',
    'shared_reports', 'site_audits', 'sources', 'tags', 'template_tags',
    'topics', 'usage_events', 'usage_metrics', 'usage_reports',
    'user_preferences', 'variant_performance'
  ];
  legacy_workspace_id uuid;
  table_has_unscoped_data boolean;
  has_unscoped_data boolean := false;
BEGIN
  FOREACH tenant_table IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS workspace_id uuid', tenant_table);
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE workspace_id IS NULL)', tenant_table)
      INTO table_has_unscoped_data;
    has_unscoped_data := has_unscoped_data OR table_has_unscoped_data;
  END LOOP;

  IF has_unscoped_data THEN
    INSERT INTO users (id, email, display_name)
    VALUES ('openaeo-legacy-owner', 'legacy-owner@openaeo.invalid', 'OpenAEO Legacy Owner')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO workspaces (name, slug, owner_id, plan)
    VALUES ('OpenAEO Workspace', 'openaeo-legacy', 'openaeo-legacy-owner', 'free')
    ON CONFLICT (slug) DO NOTHING;

    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT id, 'openaeo-legacy-owner', 'owner'
    FROM workspaces
    WHERE slug = 'openaeo-legacy'
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    SELECT id INTO STRICT legacy_workspace_id
    FROM workspaces
    WHERE slug = 'openaeo-legacy';
  END IF;

  FOREACH tenant_table IN ARRAY tenant_tables LOOP
    IF legacy_workspace_id IS NOT NULL THEN
    EXECUTE format(
      'UPDATE %I SET workspace_id = $1 WHERE workspace_id IS NULL',
      tenant_table
    ) USING legacy_workspace_id;
    END IF;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN workspace_id SET NOT NULL', tenant_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (workspace_id)', 'idx_' || tenant_table || '_workspace', tenant_table);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS workspace_isolation ON %I', tenant_table);
    EXECUTE format(
      'CREATE POLICY workspace_isolation ON %I USING (workspace_id = nullif(current_setting(''app.current_workspace_id'', true), '''')::uuid) WITH CHECK (workspace_id = nullif(current_setting(''app.current_workspace_id'', true), '''')::uuid)',
      tenant_table
    );
  END LOOP;
END $$;

ALTER TABLE competitors DROP CONSTRAINT IF EXISTS competitors_name_unique;
DROP INDEX IF EXISTS competitors_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitors_workspace_name
  ON competitors (workspace_id, name);

ALTER TABLE platform_settings DROP CONSTRAINT IF EXISTS platform_settings_platform_unique;
DROP INDEX IF EXISTS platform_settings_platform_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_settings_workspace_platform
  ON platform_settings (workspace_id, platform);

DROP INDEX IF EXISTS idx_prompt_tags_pk;
ALTER TABLE prompt_tags
  ADD CONSTRAINT idx_prompt_tags_pk PRIMARY KEY (workspace_id, prompt_id, tag_id);

DROP INDEX IF EXISTS idx_template_tags_pk;
ALTER TABLE template_tags
  ADD CONSTRAINT idx_template_tags_pk PRIMARY KEY (workspace_id, template_id, tag_id);

COMMIT;
