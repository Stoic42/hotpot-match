import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import {
  getTopHotpotScores,
  insertPartyScore,
  scoreExistsForSession,
} from "@/lib/db/queries/leaderboard";
import { getMessages } from "@/lib/db/queries/sessions";
import { getSessionById } from "@/lib/db/queries/sessions";
import {
  buildSessionStats,
  computeHotpotScore,
  computePartyScore,
  guestSummaryLabel,
  pickHighlightMoment,
} from "@/lib/party-scoring";

/** GET /api/leaderboard — global top 火锅味 */
export async function GET() {
  const rows = await getTopHotpotScores(25);
  return NextResponse.json({ entries: rows });
}

/** POST /api/leaderboard — submit score after verdict (idempotent per session). */
export async function POST(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { sessionId, ingredientsCooked = 0, displayName } = body as {
    sessionId: number;
    ingredientsCooked?: number;
    displayName?: string;
  };

  if (!sessionId || Number.isNaN(Number(sessionId))) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  if (await scoreExistsForSession(sessionId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const msgs = await getMessages(sessionId);
  const chronological = [...msgs].reverse();
  const guestIds = session.guestIds ?? [];
  const stats = buildSessionStats(guestIds, chronological, ingredientsCooked);
  const totalMessages = chronological.length;
  const partyScore = computePartyScore(stats, totalMessages, ingredientsCooked);
  const hotpotScore = computeHotpotScore(stats, partyScore, ingredientsCooked);
  const highlight = pickHighlightMoment(chronological, guestIds);

  const row = await insertPartyScore({
    sessionId,
    clientId: auth.clientId,
    displayName: displayName ?? null,
    hotpotScore,
    partyScore,
    highlightQuote: highlight.quote,
    highlightGuestId: highlight.guestId,
    guestSummary: guestSummaryLabel(guestIds),
    ingredientsCooked,
  });

  return NextResponse.json({ ok: true, entry: row, hotpotScore, partyScore });
}
