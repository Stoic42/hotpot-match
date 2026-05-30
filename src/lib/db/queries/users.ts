import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema/users";
import type { User } from "../schema/users";

export async function upsertUser(data: {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
}): Promise<User> {
  const existing = await db.select().from(users).where(eq(users.id, data.id)).limit(1);
  if (existing.length > 0) {
    const rows = await db
      .update(users)
      .set({ name: data.name ?? null, email: data.email ?? null, avatar: data.avatar ?? null, updatedAt: new Date() })
      .where(eq(users.id, data.id))
      .returning();
    return rows[0];
  }
  const rows = await db
    .insert(users)
    .values({ id: data.id, name: data.name ?? null, email: data.email ?? null, avatar: data.avatar ?? null })
    .returning();
  return rows[0];
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}
