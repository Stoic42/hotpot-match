import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

// A hotpot party session
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  guestIds: jsonb("guest_ids").notNull().$type<string[]>().default([]),
  status: text("status").notNull().default("active"), // active | ended
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
