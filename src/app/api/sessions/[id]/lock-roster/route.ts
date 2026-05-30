import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { lockSessionRoster } from "@/lib/db/queries/players";

/** POST /api/sessions/[id]/lock-roster — host starts game; fixes shared guest roster. */
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

  const result = await lockSessionRoster(sessionId, auth.clientId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    guestIds: result.session.guestIds,
    sessionId: result.session.id,
  });
}
