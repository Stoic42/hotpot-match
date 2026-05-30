import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { partyScores, type PartyScore } from "../schema/leaderboard";

export interface InsertPartyScoreInput {
  sessionId: number;
  clientId: string;
  displayName?: string | null;
  hotpotScore: number;
  partyScore: number;
  highlightQuote: string;
  highlightGuestId?: string | null;
  guestSummary: string;
  ingredientsCooked: number;
}

export async function insertPartyScore(input: InsertPartyScoreInput): Promise<PartyScore> {
  const rows = await db
    .insert(partyScores)
    .values({
      sessionId: input.sessionId,
      clientId: input.clientId,
      displayName: input.displayName ?? null,
      hotpotScore: input.hotpotScore,
      partyScore: input.partyScore,
      highlightQuote: input.highlightQuote,
      highlightGuestId: input.highlightGuestId ?? null,
      guestSummary: input.guestSummary,
      ingredientsCooked: input.ingredientsCooked,
    })
    .returning();
  return rows[0];
}

export async function getTopHotpotScores(limit = 20): Promise<PartyScore[]> {
  return db
    .select()
    .from(partyScores)
    .orderBy(desc(partyScores.hotpotScore), desc(partyScores.createdAt))
    .limit(limit);
}

export async function scoreExistsForSession(sessionId: number): Promise<boolean> {
  const rows = await db
    .select({ id: partyScores.id })
    .from(partyScores)
    .where(eq(partyScores.sessionId, sessionId))
    .limit(1);
  return rows.length > 0;
}
