import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { customGuests, type CustomGuest, type GeneratedPersona } from "../schema/custom-guests";

export interface CreateCustomGuestInput {
  name: string;
  flag: string;
  gradient: string;
  bio: string;
  traits: string[];
  dietary: string[];
  drinkingPower: number;
}

export async function createCustomGuest(
  userId: string,
  data: CreateCustomGuestInput,
): Promise<CustomGuest> {
  const rows = await db.insert(customGuests).values({ userId, ...data }).returning();
  return rows[0];
}

export async function updateCustomGuestPersona(
  id: number,
  userId: string,
  persona: GeneratedPersona,
): Promise<CustomGuest | null> {
  const rows = await db
    .update(customGuests)
    .set({ generatedPersona: persona })
    .where(and(eq(customGuests.id, id), eq(customGuests.userId, userId)))
    .returning();
  return rows[0] ?? null;
}

export async function getCustomGuestsByUser(userId: string): Promise<CustomGuest[]> {
  return db
    .select()
    .from(customGuests)
    .where(eq(customGuests.userId, userId))
    .orderBy(desc(customGuests.createdAt));
}

export async function deleteCustomGuest(id: number, userId: string): Promise<void> {
  await db
    .delete(customGuests)
    .where(and(eq(customGuests.id, id), eq(customGuests.userId, userId)));
}
