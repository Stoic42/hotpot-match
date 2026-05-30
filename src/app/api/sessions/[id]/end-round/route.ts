import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { endSession, getSessionById } from "@/lib/db/queries/sessions";
import { roundStateFromTimestamps } from "@/lib/round-state";

/** POST /api/sessions/[id]/end-round — mark table finished (any joined player). */
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

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await endSession(sessionId);

  const updated = await getSessionById(sessionId);
  const round = roundStateFromTimestamps(
    updated?.roundStartedAt ?? null,
    updated?.roundEndedAt ?? null,
    updated?.status ?? "ended",
  );

  return NextResponse.json({ ok: true, round });
}
