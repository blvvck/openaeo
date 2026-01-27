CREATE TABLE "public"."prompt_tracking_settings" (
    "workspace_id" UUID NOT NULL,
    "frequency" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "run_locked_until" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_tracking_settings_pkey" PRIMARY KEY ("workspace_id")
);

ALTER TABLE "public"."prompt_tracking_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prompt_tracking_settings" FORCE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON "public"."prompt_tracking_settings"
USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
WITH CHECK ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
