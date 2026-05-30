import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import { sessions, messages } from "../schema/sessions";
import type { Session, Message } from "../schema/sessions";

export async function createSession(userId: string, guestIds: string[]): Promise<Session> {
  const rows = await db
    .insert(sessions)
    .values({ userId, guestIds, status: "active" })
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

export async function endSession(id: number): Promise<void> {
  await db.update(sessions).set({ status: "ended", updatedAt: new Date() }).where(eq(sessions.id, id));
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
