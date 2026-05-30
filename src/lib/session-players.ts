/** Human players in a shared session (each claims one guest / character). */

export interface SessionPlayer {
  clientId: string;
  displayName: string;
  guestId: string | null;
  joinedAt: string;
  grabWins: number;
  memoryCorrect: number;
}

export function normalizePlayers(raw: unknown): SessionPlayer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is SessionPlayer =>
      p &&
      typeof p === "object" &&
      typeof (p as SessionPlayer).clientId === "string",
  );
}

export function findPlayer(players: SessionPlayer[], clientId: string): SessionPlayer | undefined {
  return players.find((p) => p.clientId === clientId);
}

export function guestTakenByOther(players: SessionPlayer[], guestId: string, clientId: string): boolean {
  return players.some((p) => p.guestId === guestId && p.clientId !== clientId);
}

export function claimedGuestIds(players: SessionPlayer[]): string[] {
  return players.map((p) => p.guestId).filter((id): id is string => !!id);
}

export function upsertPlayer(
  players: SessionPlayer[],
  clientId: string,
  patch: Partial<Pick<SessionPlayer, "displayName" | "guestId" | "grabWins" | "memoryCorrect">>,
): SessionPlayer[] {
  const idx = players.findIndex((p) => p.clientId === clientId);
  if (idx >= 0) {
    const next = [...players];
    next[idx] = { ...next[idx], ...patch };
    return next;
  }
  return [
    ...players,
    {
      clientId,
      displayName: patch.displayName ?? "玩家",
      guestId: patch.guestId ?? null,
      joinedAt: new Date().toISOString(),
      grabWins: patch.grabWins ?? 0,
      memoryCorrect: patch.memoryCorrect ?? 0,
    },
  ];
}
