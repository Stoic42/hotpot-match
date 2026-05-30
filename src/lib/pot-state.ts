import { POT_INGREDIENTS } from "@/lib/characters";
import type { CustomAgentDraft } from "@/lib/custom-agent";

export const POT_COUNTDOWN_MS = 700;
export const POT_COUNTDOWN_TICKS = 3;
/** Auto-resolve scramble if nobody taps in time */
export const POT_SCRAMBLE_MS = 2800;

// ── Timing-grab tuning (relative to an ingredient's true ready time) ──
/** Tapping within this many ms of the ready moment is a "perfect" grab. */
export const GRAB_PERFECT_WINDOW_MS = 1800;
/** Up to this many ms after ready still yields an edible "good" grab. */
export const GRAB_GOOD_LATE_MS = 5000;
/** Ungrabbed ingredients burn this long after ready (lost for everyone). */
export const GRAB_BURN_GRACE_MS = 9000;

export const GRAB_POINTS: Record<GrabQuality, number> = {
  raw: 0,
  perfect: 12,
  good: 7,
  overcooked: 3,
  burnt: 0,
};

export type GrabQuality = "raw" | "perfect" | "good" | "overcooked" | "burnt";

export interface GrabJudgment {
  quality: GrabQuality;
  points: number;
  /** Signed ms from ready (negative = early, positive = late). */
  deltaMs: number;
}

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
  quality?: GrabQuality;
  reactions: PotScrambleReaction[];
}

/** How long a grabbed ingredient stays "contestable" before it resolves. */
export const GRAB_CONTEST_MS = 650;

export interface GrabContestEntry {
  clientId: string;
  guestId: string;
  quality: GrabQuality;
  points: number;
  deltaMs: number;
}

export interface GrabContest {
  ingredientId: string;
  startedAt: string;
  resolveAt: string;
  entries: GrabContestEntry[];
}

export interface SessionPotState {
  cooking: PotCookingEntry[];
  cookedCount: number;
  scramble: PotScrambleState | null;
  hunger: Record<string, number>;
  /** Ingredients currently being fought over (resolve into a drink duel). */
  contests: GrabContest[];
}

export function emptyPotState(): SessionPotState {
  return { cooking: [], cookedCount: 0, scramble: null, hunger: {}, contests: [] };
}

export function normalizePotState(raw: unknown): SessionPotState {
  if (!raw || typeof raw !== "object") return emptyPotState();
  const o = raw as Partial<SessionPotState>;
  return {
    cooking: Array.isArray(o.cooking) ? o.cooking : [],
    cookedCount: typeof o.cookedCount === "number" ? o.cookedCount : 0,
    scramble: o.scramble ?? null,
    hunger: o.hunger && typeof o.hunger === "object" ? o.hunger : {},
    contests: Array.isArray(o.contests) ? o.contests : [],
  };
}

/**
 * Judge a grab purely by WHEN the player tapped, relative to the hidden
 * ready time. This is the heart of the memory game: players must recall the
 * cook time and tap at the right moment without an on-screen timer.
 */
export function judgeGrabQuality(
  elapsedMs: number,
  cookTimeSeconds: number,
  windowScale = 1,
): GrabJudgment {
  const readyMs = cookTimeSeconds * 1000;
  const deltaMs = elapsedMs - readyMs;
  const perfect = GRAB_PERFECT_WINDOW_MS * windowScale;
  const good = GRAB_GOOD_LATE_MS * windowScale;

  let quality: GrabQuality;
  if (deltaMs < -perfect) {
    quality = "raw"; // tapped too early — still bloody
  } else if (Math.abs(deltaMs) <= perfect) {
    quality = "perfect";
  } else if (deltaMs <= good) {
    quality = "good";
  } else {
    quality = "overcooked";
  }

  return { quality, points: GRAB_POINTS[quality], deltaMs };
}

export interface TimedGrabResult {
  ok: boolean;
  pot: SessionPotState;
  quality: GrabQuality;
  points: number;
  deltaMs: number;
  /** This tap opened a fresh contest (you reached first). */
  contestStarted?: boolean;
  /** You joined an in-progress contest — a drink duel will decide it. */
  joined?: boolean;
  /** Tapped before the ingredient was cooked — no state change, try again. */
  tooEarly?: boolean;
  /** Ingredient was already taken or burnt. */
  gone?: boolean;
  /** You already have a stake in this contest. */
  already?: boolean;
}

/**
 * Player taps 抢 on a specific cooking ingredient. Timing decides quality.
 * The first valid tap opens a short contest window; anyone else tapping the
 * same ingredient before it resolves joins, and a drink duel settles the tie.
 * Early taps fail without consuming the ingredient.
 */
export function applyTimedGrab(
  pot: SessionPotState,
  guestIds: string[],
  ingredientId: string,
  guestId: string,
  clientId: string,
  nowMs: number = Date.now(),
  windowScale = 1,
): TimedGrabResult {
  const base: TimedGrabResult = {
    ok: false,
    pot,
    quality: "raw",
    points: 0,
    deltaMs: 0,
  };

  void guestIds;
  const ing = POT_INGREDIENTS.find((i) => i.id === ingredientId);
  if (!ing) return { ...base, gone: true };

  // Already an open contest for this ingredient → try to join it.
  const existing = pot.contests.find((c) => c.ingredientId === ingredientId);
  if (existing) {
    if (existing.entries.some((e) => e.clientId === clientId)) {
      return { ...base, already: true };
    }
    const elapsed = nowMs - new Date(existing.startedAt).getTime();
    const judgment = judgeGrabQuality(elapsed, ing.cookTimeSeconds, windowScale);
    if (judgment.quality === "raw") {
      return { ...base, quality: "raw", deltaMs: judgment.deltaMs, tooEarly: true };
    }
    const contests = pot.contests.map((c) =>
      c.ingredientId === ingredientId
        ? {
            ...c,
            entries: [
              ...c.entries,
              {
                clientId,
                guestId,
                quality: judgment.quality,
                points: judgment.points,
                deltaMs: judgment.deltaMs,
              },
            ],
          }
        : c,
    );
    return {
      ok: true,
      pot: { ...pot, contests },
      quality: judgment.quality,
      points: judgment.points,
      deltaMs: judgment.deltaMs,
      joined: true,
    };
  }

  // No contest yet → must still be cooking and validly timed to open one.
  const entry = pot.cooking.find((c) => c.ingredientId === ingredientId);
  if (!entry) return { ...base, gone: true };

  const elapsed = nowMs - new Date(entry.startedAt).getTime();
  const judgment = judgeGrabQuality(elapsed, ing.cookTimeSeconds, windowScale);
  if (judgment.quality === "raw") {
    return { ...base, quality: "raw", deltaMs: judgment.deltaMs, tooEarly: true };
  }

  const cooking = pot.cooking.filter((c) => c.ingredientId !== ingredientId);
  const contest: GrabContest = {
    ingredientId,
    startedAt: entry.startedAt,
    resolveAt: new Date(nowMs + GRAB_CONTEST_MS).toISOString(),
    entries: [
      {
        clientId,
        guestId,
        quality: judgment.quality,
        points: judgment.points,
        deltaMs: judgment.deltaMs,
      },
    ],
  };

  return {
    ok: true,
    pot: { ...pot, cooking, contests: [...pot.contests, contest] },
    quality: judgment.quality,
    points: judgment.points,
    deltaMs: judgment.deltaMs,
    contestStarted: true,
  };
}

export interface ContestResolution {
  ingredientId: string;
  winnerClientId: string;
  winnerGuestId: string;
  quality: GrabQuality;
  points: number;
  duel: boolean;
  loserClientId: string | null;
  loserGuestId: string | null;
}

/**
 * Resolve any contest whose window has elapsed. A single contender just wins.
 * Two or more triggers a drink duel decided by drinkingPower (+ luck): the
 * duel winner takes the food, the loser drinks.
 */
export function resolveGrabContests(
  pot: SessionPotState,
  guestIds: string[],
  drinkingPowerById: Record<string, number>,
  nowMs: number = Date.now(),
): { pot: SessionPotState; resolutions: ContestResolution[] } {
  const resolutions: ContestResolution[] = [];
  const remaining: GrabContest[] = [];
  let cookedCount = pot.cookedCount;
  const hunger = { ...pot.hunger };

  for (const contest of pot.contests) {
    if (new Date(contest.resolveAt).getTime() > nowMs) {
      remaining.push(contest);
      continue;
    }
    if (contest.entries.length === 0) continue;

    const reachers = [...contest.entries].sort(
      (a, b) => b.points - a.points || Math.abs(a.deltaMs) - Math.abs(b.deltaMs),
    );

    let winner = reachers[0];
    let loser: GrabContestEntry | null = null;
    let duel = false;

    if (reachers.length >= 2) {
      duel = true;
      const a = reachers[0];
      const b = reachers[1];
      const scoreA = (drinkingPowerById[a.guestId] ?? 5) + Math.random() * 6;
      const scoreB = (drinkingPowerById[b.guestId] ?? 5) + Math.random() * 6;
      if (scoreB > scoreA) {
        winner = b;
        loser = a;
      } else {
        winner = a;
        loser = b;
      }
    }

    cookedCount += 1;
    for (const id of guestIds) {
      if (id === winner.guestId) hunger[id] = Math.max(0, (hunger[id] ?? 0) - 5);
      else hunger[id] = Math.min(100, (hunger[id] ?? 0) + 15);
    }

    resolutions.push({
      ingredientId: contest.ingredientId,
      winnerClientId: winner.clientId,
      winnerGuestId: winner.guestId,
      quality: winner.quality,
      points: winner.points,
      duel,
      loserClientId: loser?.clientId ?? null,
      loserGuestId: loser?.guestId ?? null,
    });
  }

  return {
    pot: { ...pot, contests: remaining, cookedCount, hunger },
    resolutions,
  };
}

/** Advance timers: burn any ingredient nobody grabbed in time. */
export function tickPotState(
  pot: SessionPotState,
  _sessionId: number,
  _guestIds: string[],
  _customGuests: CustomAgentDraft[],
  nowMs: number = Date.now(),
): SessionPotState {
  const next = normalizePotState(pot);

  const survivors: PotCookingEntry[] = [];
  let burnt = false;
  for (const entry of next.cooking) {
    const ing = POT_INGREDIENTS.find((i) => i.id === entry.ingredientId);
    if (!ing) continue;
    const readyAt = new Date(entry.startedAt).getTime() + ing.cookTimeSeconds * 1000;
    if (nowMs > readyAt + GRAB_BURN_GRACE_MS) {
      burnt = true; // overcooked & abandoned — remove from pot
      continue;
    }
    survivors.push(entry);
  }

  if (!burnt) return next;
  return { ...next, cooking: survivors };
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
