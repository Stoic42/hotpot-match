import { describe, expect, test } from "bun:test";
import { CHARACTERS, CHARACTER_MAP, TOPIC_BOMBS, POT_INGREDIENTS } from "@/lib/characters";

describe("CHARACTERS", () => {
  test("all 6 characters are defined", () => {
    expect(CHARACTERS).toHaveLength(6);
  });

  test("every character has a unique id", () => {
    const ids = CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every character has required fields", () => {
    for (const c of CHARACTERS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.flag).toBeTruthy();
      expect(c.personality).toBeTruthy();
      expect(c.speakingStyle).toBeTruthy();
      expect(c.messageSamples.length).toBeGreaterThan(0);
      expect(c.drinkLines.length).toBeGreaterThan(0);
      expect(c.drinkBoastLines.length).toBeGreaterThan(0);
      expect(c.drinkDownLines.length).toBeGreaterThan(0);
      expect(c.drinkingPower).toBeGreaterThanOrEqual(0);
    }
  });

  test("youwei has alcoholAllergy set to true", () => {
    const youwei = CHARACTERS.find((c) => c.id === "youwei");
    expect(youwei).toBeDefined();
    expect(youwei!.alcoholAllergy).toBe(true);
    expect(youwei!.drinkingPower).toBe(0);
  });

  test("chen is the authority figure", () => {
    const chen = CHARACTERS.find((c) => c.id === "chen");
    expect(chen).toBeDefined();
    expect(chen!.traits).toContain("Authority");
    expect(chen!.drinkingPower).toBe(9);
  });
});

describe("CHARACTER_MAP", () => {
  test("maps all character IDs to their objects", () => {
    const keys = Object.keys(CHARACTER_MAP);
    expect(keys).toHaveLength(6);
    for (const key of keys) {
      expect(CHARACTER_MAP[key].id).toBe(key);
    }
  });

  test("all character IDs exist as keys", () => {
    for (const c of CHARACTERS) {
      expect(CHARACTER_MAP[c.id]).toBeDefined();
      expect(CHARACTER_MAP[c.id].id).toBe(c.id);
    }
  });
});

describe("TOPIC_BOMBS", () => {
  test("has 5 topic bombs", () => {
    expect(TOPIC_BOMBS).toHaveLength(6);
  });

  test("each topic bomb has required fields", () => {
    for (const t of TOPIC_BOMBS) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.labelCN).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.color).toBeTruthy();
    }
  });
});

describe("POT_INGREDIENTS", () => {
  test("has 8 ingredients", () => {
    expect(POT_INGREDIENTS).toHaveLength(8);
  });

  test("each ingredient has cook time > 0", () => {
    for (const ing of POT_INGREDIENTS) {
      expect(ing.cookTimeSeconds).toBeGreaterThan(0);
    }
  });

  test("each ingredient has required fields", () => {
    for (const ing of POT_INGREDIENTS) {
      expect(ing.id).toBeTruthy();
      expect(ing.nameCN).toBeTruthy();
      expect(ing.nameEN).toBeTruthy();
      expect(ing.emoji).toBeTruthy();
      expect(ing.color).toBeTruthy();
    }
  });
});
