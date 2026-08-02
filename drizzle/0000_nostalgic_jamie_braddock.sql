CREATE TYPE "public"."backfill_status" AS ENUM('pending', 'running', 'done', 'error');--> statement-breakpoint
CREATE TYPE "public"."habit_type" AS ENUM('sleep_duration', 'workout_frequency', 'manual');--> statement-breakpoint
CREATE TABLE "habits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '✅' NOT NULL,
	"color" text DEFAULT 'emerald' NOT NULL,
	"type" "habit_type" NOT NULL,
	"config" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_checks" (
	"habit_id" text NOT NULL,
	"local_date" date NOT NULL,
	"checked" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_checks_habit_id_local_date_pk" PRIMARY KEY("habit_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sync_states" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_synced_at" timestamp with time zone,
	"oldest_synced_date" date,
	"backfill_status" "backfill_status" DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"whoop_user_id" bigint NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"connect_subject_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_whoop_user_id_unique" UNIQUE("whoop_user_id")
);
--> statement-breakpoint
CREATE TABLE "whoop_sleeps" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"local_date" date NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"sleep_minutes" real,
	"performance_pct" real,
	"is_nap" boolean DEFAULT false NOT NULL,
	"score_state" text NOT NULL,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whoop_workouts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"local_date" date NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"sport_id" integer NOT NULL,
	"sport_name" text,
	"strain" real,
	"score_state" text NOT NULL,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_checks" ADD CONSTRAINT "manual_checks_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_states" ADD CONSTRAINT "sync_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whoop_sleeps" ADD CONSTRAINT "whoop_sleeps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whoop_workouts" ADD CONSTRAINT "whoop_workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "habits_user_idx" ON "habits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "whoop_sleeps_user_date_idx" ON "whoop_sleeps" USING btree ("user_id","local_date");--> statement-breakpoint
CREATE INDEX "whoop_workouts_user_date_idx" ON "whoop_workouts" USING btree ("user_id","local_date");--> statement-breakpoint
CREATE INDEX "whoop_workouts_user_sport_idx" ON "whoop_workouts" USING btree ("user_id","sport_id");