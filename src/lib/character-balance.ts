/**
 * Point-budget balancing so custom agents can compete with presets without min-maxing.
 * Presets were tuned by hand; customs must stay within BALANCE_BUDGET.
 */

import type { Skill } from "@/lib/characters";

export type GrabTier = "slow" | "medium" | "fast";
export type AgentArchetype =
  | "diplomat"
  | "scholar"
  | "glutton"
  | "heavy_drinker"
  | "chaos";

export const BALANCE_BUDGET = 22;

export const ARCHETYPE_LABELS: Record<AgentArchetype, { cn: string; en: string }> = {
  diplomat: { cn: "局气外交", en: "Diplomat" },
  scholar: { cn: "话痨学者", en: "Scholar" },
  glutton: { cn: "抢菜狂魔", en: "Glutton" },
  heavy_drinker: { cn: "酒桌猛将", en: "Heavy Drinker" },
  chaos: { cn: "混沌气氛", en: "Chaos" },
};

export interface ArchetypeTemplate {
  drinkingPower: number;
  grabTier: GrabTier;
  /** Suggested topic triggers (pick up to 2) */
  suggestedTopics: string[];
  alcoholAllergy?: boolean;
  cost: number;
}

/** Fixed packages — picking one is the main cost */
export const ARCHETYPE_TEMPLATES: Record<AgentArchetype, ArchetypeTemplate> = {
  diplomat: {
    drinkingPower: 5,
    grabTier: "medium",
    suggestedTopics: ["seniority", "food"],
    cost: 12,
  },
  scholar: {
    drinkingPower: 3,
    grabTier: "slow",
    suggestedTopics: ["politics", "anime"],
    cost: 10,
  },
  glutton: {
    drinkingPower: 4,
    grabTier: "fast",
    suggestedTopics: ["food", "spice"],
    cost: 13,
  },
  heavy_drinker: {
    drinkingPower: 9,
    grabTier: "medium",
    suggestedTopics: ["alcohol", "seniority"],
    cost: 15,
  },
  chaos: {
    drinkingPower: 6,
    grabTier: "fast",
    suggestedTopics: ["anime", "politics"],
    cost: 14,
  },
};

const TOPIC_TRIGGER_COST = 3;
const ALLERGY_REFUND = 4;

export function grabSpeedFromTier(tier: GrabTier): number {
  switch (tier) {
    case "fast":
      return 0.82;
    case "medium":
      return 0.58;
    case "slow":
      return 0.35;
  }
}

export function computeCustomBalanceCost(
  archetype: AgentArchetype,
  topicTriggers: string[],
  alcoholAllergy: boolean,
): number {
  const base = ARCHETYPE_TEMPLATES[archetype].cost;
  const extraTopics = Math.max(0, topicTriggers.length - 2) * TOPIC_TRIGGER_COST;
  const allergyAdj = alcoholAllergy ? -ALLERGY_REFUND : 0;
  return base + extraTopics + allergyAdj;
}

export interface BalanceValidation {
  ok: boolean;
  cost: number;
  budget: number;
  message?: string;
}

export function validateCustomBalance(
  archetype: AgentArchetype,
  topicTriggers: string[],
  alcoholAllergy: boolean,
): BalanceValidation {
  const cost = computeCustomBalanceCost(archetype, topicTriggers, alcoholAllergy);
  if (topicTriggers.length < 1) {
    return { ok: false, cost, budget: BALANCE_BUDGET, message: "至少选 1 个话题弱点" };
  }
  if (topicTriggers.length > 3) {
    return { ok: false, cost, budget: BALANCE_BUDGET, message: "最多 3 个话题弱点" };
  }
  if (cost > BALANCE_BUDGET) {
    return {
      ok: false,
      cost,
      budget: BALANCE_BUDGET,
      message: `构筑超支（${cost}/${BALANCE_BUDGET}），请换原型或减少弱点`,
    };
  }
  return { ok: true, cost, budget: BALANCE_BUDGET };
}

/** Preset roster counter-notes for UI */
/** Two battle skills per custom archetype (turn-based drink bout). */
export function skillsForArchetype(agentId: string, archetype: AgentArchetype): Skill[] {
  const p = agentId.replace(/[^a-z0-9]/gi, "_");
  switch (archetype) {
    case "diplomat":
      return [
        {
          id: `${p}_toast`,
          name: "Toast",
          nameCN: "局气敬酒",
          icon: "🤝",
          description: "回血并稳住场面",
          effect: "heal",
          value: 18,
          cooldown: 3,
        },
        {
          id: `${p}_stun`,
          name: "Face",
          nameCN: "给面子",
          icon: "🎖",
          description: "目标下回合跳过",
          effect: "skip_opponent",
          value: 1,
          cooldown: 3,
        },
      ];
    case "scholar":
      return [
        {
          id: `${p}_lecture`,
          name: "Lecture",
          nameCN: "小课堂",
          icon: "📚",
          description: "话题波及全场",
          effect: "topic_bomb",
          value: 8,
          cooldown: 3,
        },
        {
          id: `${p}_dodge`,
          name: "Dodge",
          nameCN: "装没听见",
          icon: "🙈",
          description: "本回合免疫",
          effect: "immunity",
          value: 1,
          cooldown: 4,
        },
      ];
    case "glutton":
      return [
        {
          id: `${p}_grab`,
          name: "Grab",
          nameCN: "筷子突袭",
          icon: "🥢",
          description: "强迫目标喝酒",
          effect: "forced_drink",
          value: 14,
          cooldown: 2,
        },
        {
          id: `${p}_double`,
          name: "Double",
          nameCN: "双倍辣劲",
          icon: "🔥",
          description: "下轮伤害翻倍",
          effect: "damage_boost",
          value: 2,
          cooldown: 3,
        },
      ];
    case "heavy_drinker":
      return [
        {
          id: `${p}_bomb`,
          name: "Bomb",
          nameCN: "深水炸弹",
          icon: "🥃",
          description: "暴击伤害",
          effect: "damage_boost",
          value: 2,
          cooldown: 2,
        },
        {
          id: `${p}_pour`,
          name: "Pour",
          nameCN: "满上",
          icon: "🍶",
          description: "逼目标硬喝",
          effect: "forced_drink",
          value: 16,
          cooldown: 3,
        },
      ];
    case "chaos":
      return [
        {
          id: `${p}_chaos`,
          name: "Chaos",
          nameCN: "搅局",
          icon: "🌪",
          description: "全场话题伤害",
          effect: "topic_bomb",
          value: 10,
          cooldown: 3,
        },
        {
          id: `${p}_stun2`,
          name: "Stun",
          nameCN: "带偏节奏",
          icon: "💫",
          description: "眩晕对手",
          effect: "skip_opponent",
          value: 1,
          cooldown: 2,
        },
      ];
  }
}

export const PRESET_COUNTER_MATRIX: { a: string; b: string; note: string }[] = [
  { a: "chen", b: "youwei", note: "陈压制酒桌规矩，悠微政论分心但抢菜仍猛" },
  { a: "leo", b: "chen", note: "Leo 分心 vs 陈精准捞" },
  { a: "youwei", b: "alcohol", note: "悠微酒精过敏 — 酒局话题必冻结" },
  { a: "zion", b: "marta", note: "Zion 谨慎慢捞，Marta 辈分敏感易暴怒" },
  { a: "nina", b: "heavy", note: "Nina 酒桌赌气 vs 高酒量角色" },
];
