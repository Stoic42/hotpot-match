import { eq } from "drizzle-orm";
import { db } from "../client";
import { sessions } from "../schema/sessions";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import {
  addIngredientToPot,
  applyTimedGrab,
  dismissPotScramble,
  emptyPotState,
  normalizePotState,
  resolveGrabContests,
  tickPotState,
  type GrabQuality,
  type SessionPotState,
} from "@/lib/pot-state";
import { normalizePlayers, recordDrink, recordGrab } from "@/lib/session-players";
import { GRAB_WIN_LINES } from "@/lib/pot-grab-lines";
import { buildCharacterMap, grabWindowScale } from "@/lib/character-registry";
import { guestIdForClient } from "./players";
import { CHARACTER_MAP, POT_INGREDIENTS } from "@/lib/characters";
import { addMessage, getSessionById } from "./sessions";

const GRAB_QUALITY_LABEL: Record<GrabQuality, string> = {
  perfect: "完美",
  good: "不错",
  overcooked: "老了",
  raw: "还没熟",
  burnt: "糊了",
};

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

  // Resolve any grab contests whose window has elapsed (drink duels).
  const charMap = buildCharacterMap(customGuests);
  const drinkingPowerById: Record<string, number> = {};
  for (const id of guestIds) drinkingPowerById[id] = charMap[id]?.drinkingPower ?? 5;

  const { pot: resolvedPot, resolutions } = resolveGrabContests(
    pot,
    guestIds,
    drinkingPowerById,
  );
  pot = resolvedPot;

  if (resolutions.length > 0) {
    let players = normalizePlayers(session.players);
    const messages: { guestId: string; content: string }[] = [];

    for (const r of resolutions) {
      players = recordGrab(players, r.winnerClientId, r.points, r.quality === "perfect", r.duel);
      if (r.duel && r.loserClientId) {
        players = recordDrink(players, r.loserClientId);
      }
      const ing = POT_INGREDIENTS.find((i) => i.id === r.ingredientId);
      const wName = charMap[r.winnerGuestId]?.name ?? r.winnerGuestId;
      const label = GRAB_QUALITY_LABEL[r.quality];
      if (r.duel && r.loserGuestId) {
        const lName = charMap[r.loserGuestId]?.name ?? r.loserGuestId;
        messages.push({
          guestId: "system",
          content: `🍶 ${ing?.nameCN ?? "菜"}之争！${wName} vs ${lName} — ${wName} ${label}抢到 +${r.points}分，${lName} 干一杯！`,
        });
      } else {
        const winLines = GRAB_WIN_LINES[r.winnerGuestId];
        const flavour = winLines?.length
          ? ` ${winLines[Math.floor(Math.random() * winLines.length)]}`
          : "";
        messages.push({
          guestId: "system",
          content: `${ing?.emoji ?? "🍲"} ${wName} ${label}抢到${ing?.nameCN ?? "菜"}！+${r.points}分${flavour}`,
        });
      }
    }

    await db
      .update(sessions)
      .set({ potState: pot, players, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    for (const m of messages) {
      await addMessage(sessionId, m.guestId, m.content, "announcement");
    }
    return pot;
  }

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
  ingredientId: string,
): Promise<
  | {
      ok: true;
      pot: SessionPotState;
      guestId: string;
      quality: GrabQuality;
      points: number;
      contested: boolean;
      joined: boolean;
    }
  | { ok: false; error: string; tooEarly?: boolean; gone?: boolean; already?: boolean }
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

  const customs = (session.customGuests ?? []) as CustomAgentDraft[];
  const result = applyTimedGrab(
    pot,
    session.guestIds ?? [],
    ingredientId,
    guestId,
    clientId,
    Date.now(),
    grabWindowScale(guestId, customs),
  );

  if (!result.ok) {
    if (result.tooEarly) {
      return { ok: false, error: "还没熟，等等！", tooEarly: true };
    }
    if (result.already) {
      return { ok: false, error: "你已经出手了，等结算", already: true };
    }
    return { ok: false, error: "手慢了，菜没了", gone: true };
  }

  // Points & feed are settled when the contest window resolves (drink duel).
  await savePotState(sessionId, result.pot);

  const contested = (result.pot.contests.find((c) => c.ingredientId === ingredientId)?.entries
    .length ?? 0) > 1;

  return {
    ok: true,
    pot: result.pot,
    guestId,
    quality: result.quality,
    points: result.points,
    contested: contested || Boolean(result.joined),
    joined: Boolean(result.joined),
  };
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
