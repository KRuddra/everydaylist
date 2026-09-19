-- Down migration for 0000_careful_thunderball.sql
-- Reverses the forward migration in full: drops indexes (implicitly, via
-- their owning tables), the foreign key, both tables, and the pg_trgm
-- extension, leaving zero objects behind.
--
-- Indexes and the CHECK constraint are dropped automatically when their
-- owning table is dropped, so they are not named individually here; the
-- FK is dropped explicitly first so table drop order doesn't matter.

ALTER TABLE "task_comments" DROP CONSTRAINT IF EXISTS "task_comments_task_id_tasks_id_fk";
--> statement-breakpoint
DROP TABLE IF EXISTS "task_comments";
--> statement-breakpoint
DROP TABLE IF EXISTS "tasks";
--> statement-breakpoint
DROP EXTENSION IF EXISTS pg_trgm;
