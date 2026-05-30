import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import type { SessionPotState } from "@/lib/pot-state";
import { emptyPotState } from "@/lib/pot-state";

// A hotpot party session
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  guestIds: jsonb("guest_ids").notNull().$type<string[]>().default([]),
  customGuests: jsonb("custom_guests").$type<CustomAgentDraft[]>().default([]),
  status: text("status").notNull().default("active"), // active | ended
  /** Server-authoritative 1-minute round start (set once after memory flash). */
  roundStartedAt: timestamp("round_started_at"),
  roundEndedAt: timestamp("round_ended_at"),
  potState: jsonb("pot_state").$type<SessionPotState>().default(emptyPotState()),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messages in a party feed
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  guestId: text("guest_id").notNull(), // character key
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("chat"), // chat | reaction | announcement
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Session = InferSelectModel<typeof sessions>;
export type Message = InferSelectModel<typeof messages>;
