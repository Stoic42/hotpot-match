ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "players" jsonb DEFAULT '[]'::jsonb NOT NULL;
