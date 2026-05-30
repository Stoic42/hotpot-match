import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/auth";
import {
  createCustomGuest,
  deleteCustomGuest,
  getCustomGuestsByUser,
  updateCustomGuestPersona,
} from "@/lib/db/queries";
import { generateCustomGuestPersona } from "@/lib/ai/custom-guest-persona";

interface CustomGuestBody {
  name: string;
  flag?: string;
  gradient?: string;
  bio: string;
  traits?: string[];
  dietary?: string[];
  drinkingPower?: number;
}

export async function GET(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;
  const guests = await getCustomGuestsByUser(auth.clientId);
  return NextResponse.json({ guests });
}

export async function POST(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;

  const body = await request.json() as CustomGuestBody;
  const name = body.name?.trim().slice(0, 30);
  const bio = body.bio?.trim().slice(0, 300);
  if (!name || !bio) {
    return NextResponse.json({ error: "name and bio are required" }, { status: 400 });
  }

  const input = {
    name,
    flag: body.flag || "🎭",
    gradient: body.gradient || "from-violet-800 to-rose-900",
    bio,
    traits: (body.traits ?? []).slice(0, 6),
    dietary: body.dietary ?? [],
    drinkingPower: Math.min(10, Math.max(1, body.drinkingPower ?? 5)),
  };

  const guest = await createCustomGuest(auth.clientId, input);
  const persona = await generateCustomGuestPersona(input);
  const updated = await updateCustomGuestPersona(guest.id, auth.clientId, persona);

  return NextResponse.json({ guest: updated ?? guest }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await deleteCustomGuest(id, auth.clientId);
  return NextResponse.json({ ok: true });
}
