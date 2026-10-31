CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"source" text DEFAULT 'island' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_messages_user_created_idx" ON "chat_messages" ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
