import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import { sessions, messages } from "../schema/sessions";
import type { Session, Message } from "../schema/sessions";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import { upsertPlayer } from "@/lib/session-players";

export async function createSession(
  userId: string,
  guestIds: string[],
  customGuests: CustomAgentDraft[] = [],
  options?: { lobby?: boolean },
): Promise<Session> {
  const lobby = options?.lobby ?? guestIds.length === 0;
  const players = lobby
    ? upsertPlayer([], userId, { displayName: "房主" })
    : [];

  const rows = await db
    .insert(sessions)
    .values({
      userId,
      guestIds: lobby ? [] : guestIds,
      customGuests: lobby ? [] : customGuests,
      players,
      status: "active",
    })
    .returning();
  return rows[0];
}

export async function getActiveSession(userId: string): Promise<Session | null> {
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.status, "active")))
    .orderBy(desc(sessions.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSessionById(id: number): Promise<Session | null> {
  const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Idempotent — first client to finish memory flash starts the shared clock. */
export async function startRound(id: number): Promise<Session | null> {
  const existing = await getSessionById(id);
  if (!existing) return null;
  if (existing.roundStartedAt) return existing;

  const now = new Date();
  const rows = await db
    .update(sessions)
    .set({ roundStartedAt: now, updatedAt: now })
    .where(eq(sessions.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function endSession(id: number): Promise<void> {
  const now = new Date();
  await db
    .update(sessions)
    .set({ status: "ended", roundEndedAt: now, updatedAt: now })
    .where(eq(sessions.id, id));
}

export async function addMessage(
  sessionId: number,
  guestId: string,
  content: string,
  messageType = "chat"
): Promise<Message> {
  const rows = await db
    .insert(messages)
    .values({ sessionId, guestId, content, messageType })
    .returning();
  return rows[0];
}

export async function getMessages(sessionId: number): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(desc(messages.createdAt))
    .limit(100);
}
