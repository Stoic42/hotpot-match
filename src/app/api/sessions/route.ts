import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { createSession, getActiveSession, endSession } from "@/lib/db/queries/sessions";
import { CHARACTERS } from "@/lib/characters";

// POST /api/sessions — create a new party session
export async function POST(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;
  const userId = auth.clientId;

  const body = await request.json();
  const { guestIds } = body as { guestIds: string[] };

  const MAX_GUESTS = 5;

  if (!Array.isArray(guestIds) || guestIds.length < 1) {
    return NextResponse.json({ error: "At least 1 guest required" }, { status: 400 });
  }

  if (guestIds.length > MAX_GUESTS) {
    return NextResponse.json({ error: `Maximum ${MAX_GUESTS} guests allowed` }, { status: 400 });
  }

  // Validate all guest IDs exist
  const validIds = guestIds.filter((id) => CHARACTERS.find((c) => c.id === id));
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid guest IDs" }, { status: 400 });
  }

  // End any existing active session
  const existing = await getActiveSession(userId);
  if (existing) {
    await endSession(existing.id);
  }

  const session = await createSession(userId, validIds);
  return NextResponse.json(session, { status: 201 });
}

// GET /api/sessions — get active session
export async function GET(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;
  const userId = auth.clientId;

  const session = await getActiveSession(userId);
  if (!session) return NextResponse.json(null);
  return NextResponse.json(session);
}
