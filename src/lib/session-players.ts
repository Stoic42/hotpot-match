/** Human players in a shared session (each claims one guest / character). */

export interface SessionPlayer {
  clientId: string;
  displayName: string;
  guestId: string | null;
  joinedAt: string;
  grabWins: number;
  memoryCorrect: number;
  /** Grabs landed inside the perfect timing window. */
  perfectGrabs: number;
  /** Cumulative grab points (perfect=12, good=7, overcooked=3). */
  points: number;
  /** Drink duels won when contesting a grab. */
  drinkDuelsWon: number;
  /** Cups drunk (lost duels / penalties) — feeds the verdict. */
  drinks: number;
}

export function withPlayerDefaults(p: SessionPlayer): SessionPlayer {
  return {
    ...p,
    grabWins: p.grabWins ?? 0,
    memoryCorrect: p.memoryCorrect ?? 0,
    perfectGrabs: p.perfectGrabs ?? 0,
    points: p.points ?? 0,
    drinkDuelsWon: p.drinkDuelsWon ?? 0,
    drinks: p.drinks ?? 0,
  };
}

export function normalizePlayers(raw: unknown): SessionPlayer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is SessionPlayer =>
        p &&
        typeof p === "object" &&
        typeof (p as SessionPlayer).clientId === "string",
    )
    .map(withPlayerDefaults);
}

/** Record a successful grab for the player's running tally. */
export function recordGrab(
  players: SessionPlayer[],
  clientId: string,
  points: number,
  perfect: boolean,
  wonDuel = false,
): SessionPlayer[] {
  return players.map((p) =>
    p.clientId === clientId
      ? {
          ...withPlayerDefaults(p),
          grabWins: (p.grabWins ?? 0) + 1,
          perfectGrabs: (p.perfectGrabs ?? 0) + (perfect ? 1 : 0),
          points: (p.points ?? 0) + points,
          drinkDuelsWon: (p.drinkDuelsWon ?? 0) + (wonDuel ? 1 : 0),
        }
      : p,
  );
}

/** Record a lost duel — the player drinks a cup. */
export function recordDrink(players: SessionPlayer[], clientId: string): SessionPlayer[] {
  return players.map((p) =>
    p.clientId === clientId
      ? { ...withPlayerDefaults(p), drinks: (p.drinks ?? 0) + 1 }
      : p,
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
      perfectGrabs: 0,
      points: 0,
      drinkDuelsWon: 0,
      drinks: 0,
    },
  ];
}
