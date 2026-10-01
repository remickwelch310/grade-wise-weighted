ALTER TABLE "trackers" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "trackers" ADD CONSTRAINT "trackers_user_id_key" UNIQUE("user_id");