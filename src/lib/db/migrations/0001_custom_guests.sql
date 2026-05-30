CREATE TABLE "custom_guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"flag" text DEFAULT '🎭' NOT NULL,
	"gradient" text DEFAULT 'from-violet-800 to-rose-900' NOT NULL,
	"bio" text NOT NULL,
	"traits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dietary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"drinking_power" integer DEFAULT 5 NOT NULL,
	"generated_persona" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
