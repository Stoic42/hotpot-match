import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export interface GeneratedPersona {
  personality: string;
  speakingStyle: string;
  messageSamples: string[];
  drinkLines: string[];
  drinkBoastLines: string[];
  drinkDownLines: string[];
  topicReactions: Record<string, string>;
  weaknessTopic: string;
  weaknessDescription: string;
  strengthDescription: string;
}

export const customGuests = pgTable("custom_guests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  flag: text("flag").notNull().default("🎭"),
  gradient: text("gradient").notNull().default("from-violet-800 to-rose-900"),
  bio: text("bio").notNull(),
  traits: jsonb("traits").notNull().$type<string[]>().default([]),
  dietary: jsonb("dietary").notNull().$type<string[]>().default([]),
  drinkingPower: integer("drinking_power").notNull().default(5),
  generatedPersona: jsonb("generated_persona").$type<GeneratedPersona>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CustomGuest = InferSelectModel<typeof customGuests>;
