import { eq } from "drizzle-orm";
import { db } from "../client";
import { sessions } from "../schema/sessions";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import {
  addIngredientToPot,
  applyPlayerGrab,
  dismissPotScramble,
  emptyPotState,
  normalizePotState,
  tickPotState,
  type SessionPotState,
} from "@/lib/pot-state";
import { guestIdForClient } from "./players";
import { CHARACTER_MAP, POT_INGREDIENTS } from "@/lib/characters";
import { addMessage, getSessionById } from "./sessions";

export async function getSessionPotState(sessionId: number): Promise<SessionPotState> {
  const session = await getSessionById(sessionId);
  if (!session) return emptyPotState();
  return normalizePotState(session.potState);
}

async function savePotState(sessionId: number, pot: SessionPotState): Promise<void> {
  const now = new Date();
  await db
    .update(sessions)
    .set({ potState: pot, updatedAt: now })
    .where(eq(sessions.id, sessionId));
}

export async function tickAndPersistPotState(sessionId: number): Promise<SessionPotState> {
  const session = await getSessionById(sessionId);
  if (!session) return emptyPotState();

  const guestIds = session.guestIds ?? [];
  const customGuests = (session.customGuests ?? []) as CustomAgentDraft[];
  let pot = normalizePotState(session.potState);
  const before = JSON.stringify(pot);

  pot = tickPotState(pot, sessionId, guestIds, customGuests);

  if (JSON.stringify(pot) !== before) {
    await savePotState(sessionId, pot);
  }

  return pot;
}

export async function applyPotAddIngredient(
  sessionId: number,
  ingredientId: string,
): Promise<{ ok: true; pot: SessionPotState } | { ok: false; error: string }> {
  const session = await getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found" };

  let pot = normalizePotState(session.potState);
  pot = tickPotState(pot, sessionId, session.guestIds ?? [], (session.customGuests ?? []) as CustomAgentDraft[]);

  const updated = addIngredientToPot(pot, ingredientId);
  if (!updated) return { ok: false, error: "Cannot add ingredient now" };

  await savePotState(sessionId, updated);

  const ing = POT_INGREDIENTS.find((i) => i.id === ingredientId);
  if (ing) {
    await addMessage(
      sessionId,
      "system",
      `${ing.emoji} ${ing.nameCN} 下锅！记牢烫几秒——熟了要抢`,
      "announcement",
    );
  }

  return { ok: true, pot: updated };
}

export async function applyPotGrab(
  sessionId: number,
  clientId: string,
): Promise<
  | { ok: true; pot: SessionPotState; guestId: string }
  | { ok: false; error: string }
> {
  const session = await getSessionById(sessionId);
  if (!session) return { ok: false, error: "Session not found" };

  const guestId = guestIdForClient(session, clientId);
  if (!guestId) {
    return { ok: false, error: "Claim a character in the lobby first" };
  }

  let pot = normalizePotState(session.potState);
  pot = tickPotState(
    pot,
    sessionId,
    session.guestIds ?? [],
    (session.customGuests ?? []) as CustomAgentDraft[],
  );

  const updated = applyPlayerGrab(
    pot,
    sessionId,
    session.guestIds ?? [],
    (session.customGuests ?? []) as CustomAgentDraft[],
    guestId,
    clientId,
  );

  if (!updated) {
    return { ok: false, error: "Not in grab window" };
  }

  if (updated.scramble?.grabbedByClientId !== clientId) {
    return { ok: false, error: "Too slow — already grabbed" };
  }

  await savePotState(sessionId, updated);
  return { ok: true, pot: updated, guestId };
}

export async function applyPotDismissScramble(sessionId: number): Promise<SessionPotState> {
  const session = await getSessionById(sessionId);
  if (!session) return emptyPotState();

  let pot = normalizePotState(session.potState);
  const scramble = pot.scramble;

  if (scramble?.phase === "result") {
    const ing = POT_INGREDIENTS.find((i) => i.id === scramble.ingredientId);
    const winnerLabel = scramble.grabbedBy
      ? CHARACTER_MAP[scramble.grabbedBy]?.name ?? scramble.grabbedBy
      : null;

    await addMessage(
      sessionId,
      "system",
      `${ing?.emoji ?? "🍲"} ${ing?.nameCN ?? "菜"} 熟了！${
        winnerLabel ? ` ${winnerLabel} 抢到了！` : " 没人抢到……"
      }`,
      "announcement",
    );

    for (const r of scramble.reactions) {
      await addMessage(sessionId, r.guestId, r.line, "chat");
    }
  }

  pot = dismissPotScramble(pot);
  await savePotState(sessionId, pot);
  return pot;
}
