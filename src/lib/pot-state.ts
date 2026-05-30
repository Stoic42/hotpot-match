import { POT_INGREDIENTS } from "@/lib/characters";
import type { CustomAgentDraft } from "@/lib/custom-agent";
import { getGrabSpeed } from "@/lib/character-registry";
import { GRAB_MISS_LINES, GRAB_WIN_LINES } from "@/lib/pot-grab-lines";

export const POT_COUNTDOWN_MS = 700;
export const POT_COUNTDOWN_TICKS = 3;
/** Auto-resolve scramble if nobody taps in time */
export const POT_SCRAMBLE_MS = 2800;

export interface PotCookingEntry {
  ingredientId: string;
  startedAt: string;
  notified: boolean;
}

export interface PotScrambleReaction {
  guestId: string;
  speed: "fast" | "slow" | "miss";
  line: string;
}

export interface PotScrambleState {
  ingredientId: string;
  phase: "counting" | "scramble" | "result";
  startedAt: string;
  scrambleAt: string | null;
  grabbedBy: string | null;
  /** Human who tapped 抢 first (maps to grabbedBy guest via session players). */
  grabbedByClientId: string | null;
  reactions: PotScrambleReaction[];
}

export interface SessionPotState {
  cooking: PotCookingEntry[];
  cookedCount: number;
  scramble: PotScrambleState | null;
  hunger: Record<string, number>;
}

export function emptyPotState(): SessionPotState {
  return { cooking: [], cookedCount: 0, scramble: null, hunger: {} };
}

export function normalizePotState(raw: unknown): SessionPotState {
  if (!raw || typeof raw !== "object") return emptyPotState();
  const o = raw as Partial<SessionPotState>;
  return {
    cooking: Array.isArray(o.cooking) ? o.cooking : [],
    cookedCount: typeof o.cookedCount === "number" ? o.cookedCount : 0,
    scramble: o.scramble ?? null,
    hunger: o.hunger && typeof o.hunger === "object" ? o.hunger : {},
  };
}

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveScramble(
  pot: SessionPotState,
  sessionId: number,
  guestIds: string[],
  customGuests: CustomAgentDraft[],
  forcedWinnerId?: string,
): SessionPotState {
  const scramble = pot.scramble;
  if (!scramble) return pot;

  const ing = POT_INGREDIENTS.find((i) => i.id === scramble.ingredientId);
  if (!ing) {
    return { ...pot, scramble: null };
  }

  const rand = seededRandom(`${sessionId}:${scramble.ingredientId}:${scramble.startedAt}`);
  const threshold = 0.42;

  let grabbedBy: string | null = forcedWinnerId ?? scramble.grabbedBy ?? null;

  const rolls = guestIds
    .map((guestId) => {
      const hungerBoost = Math.min(0.22, (pot.hunger[guestId] ?? 0) / 450);
      return {
        guestId,
        roll: getGrabSpeed(guestId, customGuests) * 0.72 + hungerBoost + rand() * 0.42,
      };
    })
    .sort((a, b) => b.roll - a.roll);

  if (!grabbedBy) {
    const contenders = rolls.filter((r) => r.roll > threshold);
    const totalWeight = contenders.reduce((sum, r) => sum + Math.max(0.1, r.roll), 0);
    let cursor = rand() * totalWeight;
    for (const contender of contenders) {
      cursor -= Math.max(0.1, contender.roll);
      if (cursor <= 0) {
        grabbedBy = contender.guestId;
        break;
      }
    }
    grabbedBy ??= contenders[0]?.guestId ?? null;
  }

  const notable = rolls
    .filter((r) => r.guestId === grabbedBy || r.roll > threshold * 0.72)
    .slice(0, Math.min(6, rolls.length));

  const reactions: PotScrambleReaction[] = notable.map((r) => {
    const isWinner = r.guestId === grabbedBy;
    const isSlow = !isWinner && r.roll > threshold * 0.8;
    const speed: PotScrambleReaction["speed"] = isWinner ? "fast" : isSlow ? "slow" : "miss";

    let line: string;
    if (isWinner) {
      const pool = GRAB_WIN_LINES[r.guestId] ?? ["Got it!"];
      line = pool[Math.floor(rand() * pool.length)];
    } else {
      line = GRAB_MISS_LINES[r.guestId] ?? "missed it...";
    }
    return { guestId: r.guestId, speed, line };
  });

  const hunger = { ...pot.hunger };
  if (grabbedBy) {
    for (const id of guestIds) {
      if (id !== grabbedBy) {
        hunger[id] = Math.min(100, (hunger[id] ?? 0) + 15);
      } else {
        hunger[id] = Math.max(0, (hunger[id] ?? 0) - 5);
      }
    }
  }

  const cooking = pot.cooking.filter((c) => c.ingredientId !== scramble.ingredientId);

  return {
    cooking,
    cookedCount: pot.cookedCount + 1,
    hunger,
    scramble: {
      ...scramble,
      phase: "result",
      grabbedBy,
      grabbedByClientId: scramble.grabbedByClientId,
      reactions,
    },
  };
}

/** First human tap wins the scramble for their claimed guest. */
export function applyPlayerGrab(
  pot: SessionPotState,
  sessionId: number,
  guestIds: string[],
  customGuests: CustomAgentDraft[],
  guestId: string,
  clientId: string,
): SessionPotState | null {
  const scramble = pot.scramble;
  if (!scramble || scramble.phase !== "scramble") return null;
  if (scramble.grabbedBy) return pot;

  const withGrab: SessionPotState = {
    ...pot,
    scramble: {
      ...scramble,
      grabbedBy: guestId,
      grabbedByClientId: clientId,
    },
  };
  return resolveScramble(withGrab, sessionId, guestIds, customGuests, guestId);
}

/** Advance timers & resolve scramble on the server clock. */
export function tickPotState(
  pot: SessionPotState,
  sessionId: number,
  guestIds: string[],
  customGuests: CustomAgentDraft[],
  nowMs: number = Date.now(),
): SessionPotState {
  let next = normalizePotState(pot);

  if (next.scramble) {
    const s = next.scramble;
    const started = new Date(s.startedAt).getTime();
    const elapsed = nowMs - started;

    if (s.phase === "counting") {
      if (elapsed >= POT_COUNTDOWN_MS * POT_COUNTDOWN_TICKS) {
        next = {
          ...next,
          scramble: {
            ...s,
            phase: "scramble",
            scrambleAt: new Date(nowMs).toISOString(),
          },
        };
      }
      return next;
    }

    if (s.phase === "scramble") {
      const scrambleStart = s.scrambleAt ? new Date(s.scrambleAt).getTime() : started;
      if (nowMs - scrambleStart >= POT_SCRAMBLE_MS) {
        return resolveScramble(next, sessionId, guestIds, customGuests);
      }
      return next;
    }

    return next;
  }

  for (const entry of [...next.cooking]) {
    if (entry.notified) continue;
    const ing = POT_INGREDIENTS.find((i) => i.id === entry.ingredientId);
    if (!ing) continue;
    const readyAt = new Date(entry.startedAt).getTime() + ing.cookTimeSeconds * 1000;
    if (nowMs >= readyAt) {
      const cooking = next.cooking.map((c) =>
        c.ingredientId === entry.ingredientId ? { ...c, notified: true } : c,
      );
      return {
        ...next,
        cooking,
        scramble: {
          ingredientId: entry.ingredientId,
          phase: "counting",
          startedAt: new Date(nowMs).toISOString(),
          scrambleAt: null,
          grabbedBy: null,
          grabbedByClientId: null,
          reactions: [],
        },
      };
    }
  }

  return next;
}

export function addIngredientToPot(
  pot: SessionPotState,
  ingredientId: string,
  nowMs: number = Date.now(),
): SessionPotState | null {
  if (pot.scramble) return null;
  if (pot.cooking.some((c) => c.ingredientId === ingredientId)) return null;
  if (!POT_INGREDIENTS.some((i) => i.id === ingredientId)) return null;

  return {
    ...pot,
    cooking: [
      ...pot.cooking,
      { ingredientId, startedAt: new Date(nowMs).toISOString(), notified: false },
    ],
  };
}

export function dismissPotScramble(pot: SessionPotState): SessionPotState {
  if (!pot.scramble || pot.scramble.phase !== "result") return pot;
  return { ...pot, scramble: null };
}

export function scrambleCountdownRemaining(scramble: PotScrambleState, nowMs: number): number {
  if (scramble.phase !== "counting") return 0;
  const elapsed = nowMs - new Date(scramble.startedAt).getTime();
  return Math.max(0, POT_COUNTDOWN_TICKS - Math.floor(elapsed / POT_COUNTDOWN_MS));
}
