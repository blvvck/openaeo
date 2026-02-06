CREATE TABLE "public"."insight_status" (
    "workspace_id" UUID NOT NULL,
    "insight_id" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_status_pkey" PRIMARY KEY ("workspace_id", "insight_id")
);

ALTER TABLE "public"."insight_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."insight_status" FORCE ROW LEVEL SECURITY;

CREATE POLICY insight_status_workspace_isolation ON "public"."insight_status"
USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
WITH CHECK ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
