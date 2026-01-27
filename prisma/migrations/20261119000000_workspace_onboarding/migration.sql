ALTER TABLE "workspaces" ADD COLUMN "onboarding_completed_at" TIMESTAMP(6);

UPDATE "workspaces" SET "onboarding_completed_at" = COALESCE("created_at", NOW()) WHERE "onboarding_completed_at" IS NULL;
