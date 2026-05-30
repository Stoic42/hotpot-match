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
  const { guestIds = [], customGuests = [], lobby = false } = body as {
    guestIds?: string[];
    customGuests?: CustomAgentDraft[];
    lobby?: boolean;
  };

  const MAX_GUESTS = 5;
  const customs = Array.isArray(customGuests) ? customGuests : [];
  const ids = Array.isArray(guestIds) ? guestIds : [];

  const isLobby = lobby || ids.length === 0;

  if (!isLobby) {
    if (ids.length < 1) {
      return NextResponse.json({ error: "At least 1 guest required" }, { status: 400 });
    }
    if (ids.length > MAX_GUESTS) {
      return NextResponse.json({ error: `Maximum ${MAX_GUESTS} guests allowed` }, { status: 400 });
    }
  }

  const validIds = isLobby
    ? []
    : ids.filter((id) => isValidGuestId(id, customs));
  if (!isLobby && validIds.length === 0) {
    return NextResponse.json({ error: "No valid guest IDs" }, { status: 400 });
  }

  const customForSession = customs.filter((c) => validIds.includes(c.id) && isCustomAgentId(c.id));

  try {
    const existing = await getActiveSession(userId);
    if (existing) {
      await endSession(existing.id);
    }

    const session = await createSession(userId, validIds, customForSession, {
      lobby: isLobby,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sessions]", err);
    const message = err instanceof Error ? err.message : "Database error";
    const hint = message.includes("players")
      ? "Run npm run db:push to add the players column."
      : undefined;
    return NextResponse.json(
      { error: "Failed to create session", message, hint },
      { status: 500 },
    );
  }
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
