ALTER TABLE "public"."prompts" ADD COLUMN "last_attempted_at" TIMESTAMP(6);
ALTER TABLE "public"."prompt_tracking_settings" ADD COLUMN "run_lock_token" VARCHAR(36);
