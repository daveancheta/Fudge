CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY,
	"wave_color" text DEFAULT '#ff637d' NOT NULL,
	"random_wave_color" boolean DEFAULT true NOT NULL,
	"animate_wave" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;