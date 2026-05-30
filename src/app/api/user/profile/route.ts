import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import { upsertUser } from "@/lib/db/queries/users";

export async function GET(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;
  const clientId = auth.clientId;

  const user = await upsertUser({ id: clientId, name: null, email: null, avatar: null });
  return NextResponse.json(user);
}
