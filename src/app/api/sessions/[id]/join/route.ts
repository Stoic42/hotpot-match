import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { joinSession } from "@/lib/db/queries/players";
import { normalizePlayers } from "@/lib/session-players";

/** POST /api/sessions/[id]/join — register as a human player in the lobby. */
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

  const body = await request.json().catch(() => ({}));
  const displayName =
    typeof (body as { displayName?: string }).displayName === "string"
      ? (body as { displayName: string }).displayName
      : undefined;

  const result = await joinSession(sessionId, auth.clientId, displayName);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    players: normalizePlayers(result.session.players),
    hostClientId: result.session.userId,
    rosterLocked: (result.session.guestIds ?? []).length > 0,
  });
}
