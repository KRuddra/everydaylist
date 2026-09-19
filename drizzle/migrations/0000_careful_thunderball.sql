CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"priority" text,
	"due_date" date,
	"created_date" date NOT NULL,
	"completed_date" date,
	"completed" boolean GENERATED ALWAYS AS (completed_date IS NOT NULL) STORED,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_completed_after_created_check" CHECK ("tasks"."completed_date" IS NULL OR "tasks"."completed_date" >= "tasks"."created_date")
);
--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_comments_task_created_idx" ON "task_comments" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_comments_body_trgm_idx" ON "task_comments" USING gin ("body" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "tasks_created_date_idx" ON "tasks" USING btree ("created_date");--> statement-breakpoint
CREATE INDEX "tasks_completed_date_idx" ON "tasks" USING btree ("completed_date");--> statement-breakpoint
CREATE INDEX "tasks_open_created_date_idx" ON "tasks" USING btree ("created_date") WHERE completed_date IS NULL;--> statement-breakpoint
CREATE INDEX "tasks_category_sort_idx" ON "tasks" USING btree ("category","sort_order");--> statement-breakpoint
CREATE INDEX "tasks_title_trgm_idx" ON "tasks" USING gin ("title" gin_trgm_ops);