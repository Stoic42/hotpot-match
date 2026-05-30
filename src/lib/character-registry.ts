import { CHARACTERS, CHARACTER_MAP, type Character } from "@/lib/characters";
import {
  customGrabSpeed,
  customToCharacter,
  type CustomAgentDraft,
  isCustomAgentId,
} from "@/lib/custom-agent";
import { type GrabTier, grabSpeedFromTier } from "@/lib/character-balance";
import type { TopicStatusRule } from "@/lib/guest-status";
import { GUEST_TOPIC_STATUS } from "@/lib/guest-status";
import { topicRulesForCustom } from "@/lib/custom-agent";

const PRESET_GRAB_SPEED: Record<string, number> = {
  chen: 0.9,
  bigwei: 0.85,
  youwei: 0.8,
  jenny: 0.75,
  marta: 0.7,
  steven: 0.68,
  nina: 0.65,
  joanna: 0.5,
  zion: 0.4,
  wenje: 0.38,
  leo: 0.3,
};

export function getGrabSpeed(
  characterId: string,
  customDrafts: CustomAgentDraft[],
): number {
  if (PRESET_GRAB_SPEED[characterId] != null) return PRESET_GRAB_SPEED[characterId];
  const draft = customDrafts.find((d) => d.id === characterId);
  if (draft) return customGrabSpeed(draft);
  return 0.55;
}

/**
 * Phase B role identity for grabbing:
 *  - Fast grabbers ("抢菜狂魔") get a WIDER perfect/late window (forgiving timing).
 *  - Slow grabbers ("话痨学者") get a NARROWER window but a faint memory hint
 *    as compensation — they rely on study, not reflexes.
 */
export function grabWindowScale(characterId: string, customDrafts: CustomAgentDraft[]): number {
  const speed = getGrabSpeed(characterId, customDrafts);
  return 0.6 + speed * 0.9; // ~0.87 (slow) .. ~1.41 (fast)
}

export function hasMemoryHint(characterId: string, customDrafts: CustomAgentDraft[]): boolean {
  return getGrabSpeed(characterId, customDrafts) < 0.45;
}

export function grabRoleLabel(characterId: string, customDrafts: CustomAgentDraft[]): string {
  const speed = getGrabSpeed(characterId, customDrafts);
  if (speed >= 0.7) return "手快 · 抢菜狂魔（宽容窗口）";
  if (speed < 0.45) return "记忆派 · 有熟度提示（窗口窄）";
  return "均衡型";
}

export function buildCharacterMap(customDrafts: CustomAgentDraft[]): Record<string, Character> {
  const map: Record<string, Character> = { ...CHARACTER_MAP };
  for (const d of customDrafts) {
    map[d.id] = customToCharacter(d);
  }
  return map;
}

export function buildTopicStatusMap(
  customDrafts: CustomAgentDraft[],
): Record<string, Partial<Record<string, TopicStatusRule>>> {
  const merged: Record<string, Partial<Record<string, TopicStatusRule>>> = {
    ...(GUEST_TOPIC_STATUS as Record<string, Partial<Record<string, TopicStatusRule>>>),
  };
  for (const d of customDrafts) {
    merged[d.id] = { ...merged[d.id], ...topicRulesForCustom(d) };
  }
  return merged;
}

export function listSelectableCharacters(customDrafts: CustomAgentDraft[]): Character[] {
  return [...CHARACTERS, ...customDrafts.map(customToCharacter)];
}

export function resolveGuestIds(
  guestIds: string[],
  customDrafts: CustomAgentDraft[],
): Character[] {
  const map = buildCharacterMap(customDrafts);
  return guestIds
    .map((id) => map[id])
    .filter((c): c is Character => !!c);
}

export function isValidGuestId(id: string, customDrafts: CustomAgentDraft[]): boolean {
  return !!CHARACTER_MAP[id] || customDrafts.some((d) => d.id === id);
}

export function getCharSide(guestId: string): "left" | "right" {
  if (guestId === "system") return "left";
  const preset: Record<string, "left" | "right"> = {
    chen: "left",
    leo: "right",
    youwei: "left",
    zion: "right",
    marta: "left",
    nina: "right",
  };
  if (preset[guestId]) return preset[guestId];
  const hash = guestId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % 2 === 0 ? "left" : "right";
}

export { isCustomAgentId, type GrabTier, grabSpeedFromTier };
