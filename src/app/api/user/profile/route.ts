import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { upsertUser } from "@/lib/db/queries/users";

export async function GET(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response;
  const { id, name, email, avatarUrl } = result.user;

  const user = await upsertUser({ id, name: name ?? null, email: email ?? null, avatar: avatarUrl ?? null });
  return NextResponse.json(user);
}
