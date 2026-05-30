import { describe, expect, test } from "bun:test";
import {
  PARTY_ROUND_SECONDS,
  formatPartyClock,
  partySecondsRemaining,
} from "@/lib/game-config";

describe("game-config", () => {
  test("partySecondsRemaining counts down from round start", () => {
    const start = 1_000_000;
    expect(partySecondsRemaining(start, start)).toBe(PARTY_ROUND_SECONDS);
    expect(partySecondsRemaining(start, start + 30_000)).toBe(30);
    expect(partySecondsRemaining(start, start + 60_000)).toBe(0);
    expect(partySecondsRemaining(start, start + 90_000)).toBe(0);
  });

  test("formatPartyClock renders mm:ss", () => {
    expect(formatPartyClock(65)).toBe("01:05");
    expect(formatPartyClock(0)).toBe("00:00");
  });
});
