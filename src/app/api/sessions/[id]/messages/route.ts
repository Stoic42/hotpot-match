import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { getMessages, addMessage } from "@/lib/db/queries/sessions";

// GET /api/sessions/[id]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (isNaN(sessionId)) return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

  const msgs = await getMessages(sessionId);
  return NextResponse.json(msgs.reverse()); // chronological order
}

// POST /api/sessions/[id]/messages
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (isNaN(sessionId)) return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

  const body = await request.json();
  const { guestId, content, messageType } = body as {
    guestId: string;
    content: string;
    messageType?: string;
  };

  if (!guestId || !content) {
    return NextResponse.json({ error: "guestId and content required" }, { status: 400 });
  }

  const msg = await addMessage(sessionId, guestId, content, messageType ?? "chat");
  return NextResponse.json(msg, { status: 201 });
}
