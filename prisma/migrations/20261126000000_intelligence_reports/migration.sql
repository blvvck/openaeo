CREATE TABLE "public"."intelligence_reports" (
    "workspace_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand_id" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_intelligence_reports_lookup" ON "public"."intelligence_reports"("workspace_id", "brand_id", "created_at");

ALTER TABLE "public"."intelligence_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."intelligence_reports" FORCE ROW LEVEL SECURITY;

CREATE POLICY intelligence_reports_workspace_isolation ON "public"."intelligence_reports"
USING ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
WITH CHECK ("workspace_id" = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
