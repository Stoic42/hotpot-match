import { CHARACTER_MAP, type Character } from "@/lib/characters";

export interface FeedMessageLike {
  guestId: string;
  content: string;
  messageType: string;
}

export interface SessionStats {
  guestId: string;
  messageCount: number;
  ingredientsEaten: number;
  hunger: number;
  drinkScore: number;
  chaosScore: number;
}

export function buildSessionStats(
  guestIds: string[],
  messages: FeedMessageLike[],
  ingredientsCooked: number,
): SessionStats[] {
  return guestIds.map((id) => {
    const guestMsgs = messages.filter((m) => m.guestId === id);
    const char = CHARACTER_MAP[id];
    const baseHunger =
      char?.traits.includes("Braces") ? 55
      : char?.id === "leo" ? 45
      : char?.id === "chen" ? 20
      : 35;
    const baseChaos =
      char?.id === "leo" ? 85
      : char?.id === "youwei" ? 75
      : char?.id === "chen" ? 60
      : 40;
    const baseDrink = char?.alcoholAllergy ? 0 : (char?.drinkingPower ?? 5) * 10;
    const grabSpeed =
      char?.id === "chen" ? 0.9
      : char?.id === "youwei" ? 0.8
      : char?.id === "marta" ? 0.7
      : char?.id === "nina" ? 0.65
      : char?.id === "zion" ? 0.4
      : 0.3;
    const baseEaten = Math.floor(ingredientsCooked / Math.max(1, guestIds.length));
    const bonusEaten = grabSpeed > 0.5 && ingredientsCooked > guestIds.length ? 1 : 0;

    return {
      guestId: id,
      messageCount: guestMsgs.length,
      ingredientsEaten: Math.max(0, baseEaten + bonusEaten),
      hunger: Math.min(100, baseHunger + (ingredientsCooked < 3 ? 30 : 0)),
      drinkScore: Math.min(100, baseDrink),
      chaosScore: Math.min(100, baseChaos + guestMsgs.length * 2),
    };
  });
}

export function computePartyScore(
  stats: SessionStats[],
  totalMessages: number,
  ingredientsCooked: number,
): number {
  if (stats.length === 0) return 0;
  return Math.round(
    (stats.reduce((a, s) => a + s.chaosScore, 0) / stats.length) * 0.4 +
      (totalMessages > 10 ? 70 : totalMessages * 7) * 0.3 +
      (ingredientsCooked > 3 ? 80 : ingredientsCooked * 20) * 0.3,
  );
}

/** 火锅味：熟菜、饱足、局内气氛 */
export function computeHotpotScore(
  stats: SessionStats[],
  partyScore: number,
  ingredientsCooked: number,
): number {
  if (stats.length === 0) return 0;
  const avgFull = 100 - stats.reduce((a, s) => a + s.hunger, 0) / stats.length;
  return Math.min(
    100,
    Math.round(
      Math.min(100, ingredientsCooked * 14) * 0.35 +
        partyScore * 0.35 +
        avgFull * 0.2 +
        Math.min(100, stats.reduce((a, s) => a + s.ingredientsEaten, 0) * 12) * 0.1,
    ),
  );
}

export function pickHighlightMoment(
  messages: FeedMessageLike[],
  guestIds: string[],
): { quote: string; guestId: string | null } {
  const pool = messages.filter(
    (m) => m.guestId !== "system" && m.content.length > 4,
  );
  const ruling = pool.find((m) => m.messageType === "ruling");
  if (ruling) return { quote: ruling.content.slice(0, 120), guestId: ruling.guestId };

  const chats = pool.filter((m) => m.messageType === "chat");
  if (chats.length > 0) {
    const best = chats.reduce((a, b) => (a.content.length >= b.content.length ? a : b));
    return { quote: best.content.slice(0, 120), guestId: best.guestId };
  }

  const ann = pool.find((m) => m.messageType === "announcement");
  if (ann) return { quote: ann.content.slice(0, 120), guestId: ann.guestId };

  const first = guestIds[0];
  const char = first ? CHARACTER_MAP[first] : null;
  return {
    quote: char?.messageSamples[0] ?? "一锅红汤，百味人生。",
    guestId: first ?? null,
  };
}

export function guestSummaryLabel(guestIds: string[]): string {
  return guestIds
    .map((id) => CHARACTER_MAP[id]?.name ?? id)
    .join(" · ");
}
