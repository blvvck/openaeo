CREATE TABLE "public"."workspace_invitations" (
    "workspace_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "sent_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(6),
    "invited_by" VARCHAR(255) NOT NULL,
    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "workspace_invitations_role_check" CHECK ("role" IN ('admin', 'member', 'viewer'))
);
CREATE UNIQUE INDEX "workspace_invitations_token_hash_key" ON "public"."workspace_invitations"("token_hash");
CREATE INDEX "idx_workspace_invitations_workspace_email" ON "public"."workspace_invitations"("workspace_id", "email");
CREATE INDEX "idx_workspace_invitations_workspace_expires" ON "public"."workspace_invitations"("workspace_id", "expires_at");
ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_invitations" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON "public"."workspace_invitations"
USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
WITH CHECK ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
CREATE POLICY workspace_invitation_token_lookup ON "public"."workspace_invitations"
FOR SELECT USING ("token_hash" = nullif(current_setting('app.invitation_token_hash', true), ''));

CREATE TABLE "public"."workspace_provider_keys" (
    "workspace_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "iv" VARCHAR(32) NOT NULL,
    "auth_tag" VARCHAR(32) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_provider_keys_pkey" PRIMARY KEY ("workspace_id", "provider"),
    CONSTRAINT "workspace_provider_keys_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "workspace_provider_keys_provider_check" CHECK ("provider" IN ('openai', 'anthropic', 'perplexity', 'gemini', 'xai', 'deepseek'))
);
ALTER TABLE "public"."workspace_provider_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_provider_keys" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON "public"."workspace_provider_keys"
USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
WITH CHECK ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);

CREATE TABLE "public"."workspace_integration_settings" (
    "workspace_id" UUID NOT NULL,
    "max_prompts_per_scan" INTEGER,
    "max_scans_per_hour" INTEGER,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_integration_settings_pkey" PRIMARY KEY ("workspace_id"),
    CONSTRAINT "workspace_integration_settings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "workspace_integration_settings_prompts_check" CHECK ("max_prompts_per_scan" IS NULL OR "max_prompts_per_scan" > 0),
    CONSTRAINT "workspace_integration_settings_scans_check" CHECK ("max_scans_per_hour" IS NULL OR "max_scans_per_hour" > 0)
);
ALTER TABLE "public"."workspace_integration_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_integration_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON "public"."workspace_integration_settings"
USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
WITH CHECK ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);

CREATE TABLE "public"."workspace_scan_usage" (
    "workspace_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scanned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_scan_usage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspace_scan_usage_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "idx_workspace_scan_usage_hourly" ON "public"."workspace_scan_usage"("workspace_id", "scanned_at");
ALTER TABLE "public"."workspace_scan_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_scan_usage" FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON "public"."workspace_scan_usage"
USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
WITH CHECK ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
