import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { createSession, getActiveSession, endSession } from "@/lib/db/queries/sessions";
import { isValidGuestId } from "@/lib/character-registry";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import { isCustomAgentId } from "@/lib/custom-agent";

// POST /api/sessions — create a new party session
export async function POST(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;
  const userId = auth.clientId;

  const body = await request.json();
  const { guestIds, customGuests = [] } = body as {
    guestIds: string[];
    customGuests?: CustomAgentDraft[];
  };

  const MAX_GUESTS = 5;

  if (!Array.isArray(guestIds) || guestIds.length < 1) {
    return NextResponse.json({ error: "At least 1 guest required" }, { status: 400 });
  }

  if (guestIds.length > MAX_GUESTS) {
    return NextResponse.json({ error: `Maximum ${MAX_GUESTS} guests allowed` }, { status: 400 });
  }

  const customs = Array.isArray(customGuests) ? customGuests : [];
  const validIds = guestIds.filter((id) => isValidGuestId(id, customs));
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid guest IDs" }, { status: 400 });
  }

  const customForSession = customs.filter((c) => validIds.includes(c.id) && isCustomAgentId(c.id));

  const existing = await getActiveSession(userId);
  if (existing) {
    await endSession(existing.id);
  }

  const session = await createSession(userId, validIds, customForSession);
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
