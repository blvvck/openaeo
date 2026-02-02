ALTER TABLE "workspaces" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "idx_workspaces_owner_demo" ON "workspaces"("owner_id", "is_demo");
