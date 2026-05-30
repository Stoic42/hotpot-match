import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { guestIdForClient } from "@/lib/db/queries/players";
import { getSessionById } from "@/lib/db/queries/sessions";
import { tickAndPersistPotState } from "@/lib/db/queries/pot";
import { roundStateFromTimestamps } from "@/lib/round-state";
import { normalizePlayers } from "@/lib/session-players";

/** GET /api/sessions/[id] — join a room by link (shared timer + roster). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (Number.isNaN(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const round = roundStateFromTimestamps(
    session.roundStartedAt,
    session.roundEndedAt,
    session.status,
  );

  const pot = await tickAndPersistPotState(sessionId);

  const auth = getClientId(request);
  const myGuestId =
    auth.ok ? guestIdForClient(session, auth.clientId) : null;

  return NextResponse.json({
    id: session.id,
    guestIds: session.guestIds,
    customGuests: session.customGuests ?? [],
    players: normalizePlayers(session.players),
    rosterLocked: (session.guestIds ?? []).length > 0,
    status: session.status,
    hostClientId: session.userId,
    myGuestId,
    round,
    pot,
  });
}
