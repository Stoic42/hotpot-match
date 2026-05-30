import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

/** Global hall of fame — one row per finished party (submitted at verdict). */
export const partyScores = pgTable("party_scores", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  clientId: text("client_id").notNull(),
  displayName: text("display_name"),
  /** 火锅味指数 — 越高越「像一顿正经火锅」 */
  hotpotScore: integer("hotpot_score").notNull(),
  partyScore: integer("party_score").notNull(),
  highlightQuote: text("highlight_quote").notNull(),
  highlightGuestId: text("highlight_guest_id"),
  guestSummary: text("guest_summary").notNull(),
  ingredientsCooked: integer("ingredients_cooked").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PartyScore = InferSelectModel<typeof partyScores>;
