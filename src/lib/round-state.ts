import { PARTY_ROUND_SECONDS } from "@/lib/game-config";

export type RoundPhase = "waiting" | "running" | "ended";

export interface RoundState {
  phase: RoundPhase;
  remainingSeconds: number;
  roundStartedAt: string | null;
  roundEndedAt: string | null;
}

export function roundStateFromTimestamps(
  roundStartedAt: Date | string | null,
  roundEndedAt: Date | string | null,
  status: string,
  nowMs: number = Date.now(),
): RoundState {
  const started = roundStartedAt ? new Date(roundStartedAt).getTime() : null;
  const ended = roundEndedAt ? new Date(roundEndedAt).getTime() : null;

  if (status === "ended" || (ended && ended <= nowMs)) {
    return {
      phase: "ended",
      remainingSeconds: 0,
      roundStartedAt: roundStartedAt ? new Date(roundStartedAt).toISOString() : null,
      roundEndedAt: roundEndedAt ? new Date(roundEndedAt).toISOString() : null,
    };
  }

  if (!started || !Number.isFinite(started)) {
    return {
      phase: "waiting",
      remainingSeconds: PARTY_ROUND_SECONDS,
      roundStartedAt: null,
      roundEndedAt: null,
    };
  }

  const endMs = started + PARTY_ROUND_SECONDS * 1000;
  const remaining = Math.max(0, Math.ceil((endMs - nowMs) / 1000));

  return {
    phase: remaining > 0 ? "running" : "ended",
    remainingSeconds: remaining,
    roundStartedAt: new Date(started).toISOString(),
    roundEndedAt: null,
  };
}
