import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import {
  applyPotAddIngredient,
  applyPotDismissScramble,
  tickAndPersistPotState,
} from "@/lib/db/queries/pot";

/** POST /api/sessions/[id]/pot — shared pot actions (add ingredient, dismiss scramble). */
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
  const { action, ingredientId } = body as {
    action: "add" | "dismiss_scramble";
    ingredientId?: string;
  };

  if (action === "add") {
    if (!ingredientId) {
      return NextResponse.json({ error: "ingredientId required" }, { status: 400 });
    }
    const result = await applyPotAddIngredient(sessionId, ingredientId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true, pot: result.pot });
  }

  if (action === "dismiss_scramble") {
    const pot = await applyPotDismissScramble(sessionId);
    return NextResponse.json({ ok: true, pot });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/** GET /api/sessions/[id]/pot — tick & return current pot (optional lightweight poll). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (Number.isNaN(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const pot = await tickAndPersistPotState(sessionId);
  return NextResponse.json({ pot });
}
