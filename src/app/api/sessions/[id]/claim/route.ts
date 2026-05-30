import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { claimGuest } from "@/lib/db/queries/players";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import { normalizePlayers } from "@/lib/session-players";

/** POST /api/sessions/[id]/claim — pick a unique character before the game starts. */
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

  const body = await request.json();
  const { guestId, customGuests = [] } = body as {
    guestId: string;
    customGuests?: CustomAgentDraft[];
  };

  if (!guestId) {
    return NextResponse.json({ error: "guestId required" }, { status: 400 });
  }

  const result = await claimGuest(
    sessionId,
    auth.clientId,
    guestId,
    Array.isArray(customGuests) ? customGuests : [],
  );

  if (!result.ok) {
    const status = result.error.includes("taken") ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    players: normalizePlayers(result.session.players),
    myGuestId: guestId,
  });
}
