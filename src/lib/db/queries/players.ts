import { eq } from "drizzle-orm";
import { db } from "../client";
import { sessions } from "../schema/sessions";
import type { Session } from "../schema/sessions";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import { isValidGuestId } from "@/lib/character-registry";
import {
  claimedGuestIds,
  findPlayer,
  guestTakenByOther,
  normalizePlayers,
  upsertPlayer,
} from "@/lib/session-players";
import { getSessionById } from "./sessions";

const MIN_PLAYERS_TO_START = 2;

export async function joinSession(
  sessionId: number,
  clientId: string,
  displayName?: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const session = await getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  if (session.status !== "active") return { ok: false, error: "Session ended" };
  if (session.guestIds.length > 0) {
    return { ok: true, session };
  }

  const players = normalizePlayers(session.players);
  if (findPlayer(players, clientId)) {
    return { ok: true, session };
  }

  const next = upsertPlayer(players, clientId, {
    displayName: displayName?.trim() || "玩家",
  });

  const rows = await db
    .update(sessions)
    .set({ players: next, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return { ok: true, session: rows[0] };
}

export async function claimGuest(
  sessionId: number,
  clientId: string,
  guestId: string,
  customGuests: CustomAgentDraft[] = [],
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const session = await getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  if (session.status !== "active") return { ok: false, error: "Session ended" };
  if (session.guestIds.length > 0) {
    return { ok: false, error: "Roster already locked — game in progress" };
  }

  const customs = [...(session.customGuests ?? []), ...customGuests];
  if (!isValidGuestId(guestId, customs)) {
    return { ok: false, error: "Invalid guest" };
  }

  let players = normalizePlayers(session.players);
  if (!findPlayer(players, clientId)) {
    players = upsertPlayer(players, clientId, { displayName: "玩家" });
  }

  if (guestTakenByOther(players, guestId, clientId)) {
    return { ok: false, error: "Character already taken" };
  }

  players = upsertPlayer(players, clientId, { guestId });

  const rows = await db
    .update(sessions)
    .set({ players, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return { ok: true, session: rows[0] };
}

export async function lockSessionRoster(
  sessionId: number,
  hostClientId: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const session = await getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found" };
  if (session.userId !== hostClientId) {
    return { ok: false, error: "Only host can start the party" };
  }
  if (session.guestIds.length > 0) {
    return { ok: true, session };
  }

  const players = normalizePlayers(session.players);
  const guestIds = claimedGuestIds(players);
  if (guestIds.length < MIN_PLAYERS_TO_START) {
    return {
      ok: false,
      error: `Need at least ${MIN_PLAYERS_TO_START} players with a character`,
    };
  }

  const customGuests = (session.customGuests ?? []).filter((c) =>
    guestIds.includes(c.id),
  );

  const rows = await db
    .update(sessions)
    .set({
      guestIds,
      customGuests,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return { ok: true, session: rows[0] };
}

export function guestIdForClient(session: Session, clientId: string): string | null {
  const fromPlayer = findPlayer(normalizePlayers(session.players), clientId)?.guestId;
  if (fromPlayer) return fromPlayer;
  if (session.guestIds.length === 1 && session.userId === clientId) {
    return session.guestIds[0];
  }
  return null;
}
