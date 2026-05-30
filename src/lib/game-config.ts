/** Vibe Hacks #04 — 1-minute hotpot round */
export const PARTY_ROUND_SECONDS = 60;

/** Flash all ingredient cook times at round start (memory mini-game) */
export const MEMORY_FLASH_SECONDS = 3;

export function partySecondsRemaining(
  partyStartedAtMs: number | null,
  nowMs: number,
  roundSeconds: number = PARTY_ROUND_SECONDS,
): number {
  if (partyStartedAtMs == null) return roundSeconds;
  const elapsed = (nowMs - partyStartedAtMs) / 1000;
  return Math.max(0, Math.ceil(roundSeconds - elapsed));
}

export function formatPartyClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
