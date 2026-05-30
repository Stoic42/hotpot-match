import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "@/lib/db/queries/sessions";
import { tickAndPersistPotState } from "@/lib/db/queries/pot";
import { roundStateFromTimestamps } from "@/lib/round-state";

/** GET /api/sessions/[id] — join a room by link (shared timer + roster). */
export async function GET(
  _request: NextRequest,
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

  return NextResponse.json({
    id: session.id,
    guestIds: session.guestIds,
    customGuests: session.customGuests ?? [],
    status: session.status,
    hostClientId: session.userId,
    round,
    pot,
  });
}
