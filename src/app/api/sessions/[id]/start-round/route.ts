import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { getSessionById, startRound } from "@/lib/db/queries/sessions";
import { roundStateFromTimestamps } from "@/lib/round-state";

/** POST /api/sessions/[id]/start-round — sync memory-flash end across all clients. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (Number.isNaN(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const before = await getSessionById(sessionId);
  if (!before) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = await startRound(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const round = roundStateFromTimestamps(
    session.roundStartedAt,
    session.roundEndedAt,
    session.status,
  );

  return NextResponse.json({ ok: true, round, startedBy: auth.clientId });
}
