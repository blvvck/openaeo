BEGIN;

ALTER TABLE "public"."workspace_members"
  ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD CONSTRAINT "workspace_members_status_check" CHECK ("status" IN ('active', 'deactivated'));

ALTER TABLE "public"."workspace_invitations"
  ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'invited',
  ADD COLUMN "reminded_at" TIMESTAMP(6),
  ADD COLUMN "canceled_at" TIMESTAMP(6),
  ADD CONSTRAINT "workspace_invitations_status_check" CHECK ("status" IN ('invited', 'reminder_sent', 'canceled'));

COMMIT;
