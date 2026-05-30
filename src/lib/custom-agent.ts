import type { Character } from "@/lib/characters";
import type { GeneratedPersona } from "@/lib/db/schema/custom-guests";
import {
  type AgentArchetype,
  type BalanceValidation,
  ARCHETYPE_TEMPLATES,
  grabSpeedFromTier,
  skillsForArchetype,
  validateCustomBalance,
} from "@/lib/character-balance";
import type { TopicStatusRule } from "@/lib/guest-status";

export const CUSTOM_AGENT_PREFIX = "custom-";
export const CUSTOM_AGENTS_STORAGE_KEY = "hotpot-custom-agents";
export const SESSION_CUSTOM_KEY = (sessionId: string) => `hotpot-session-custom-${sessionId}`;

export interface CustomAgentDraft {
  id: string;
  name: string;
  flag: string;
  chineseTagline: string;
  tagline: string;
  personality: string;
  speakingStyle: string;
  archetype: AgentArchetype;
  topicTriggers: string[];
  alcoholAllergy: boolean;
  generatedPersona?: GeneratedPersona;
  drinkingPowerOverride?: number;
  createdAt: string;
}

export function isCustomAgentId(id: string): boolean {
  return id.startsWith(CUSTOM_AGENT_PREFIX);
}

export function newCustomAgentId(): string {
  return `${CUSTOM_AGENT_PREFIX}${crypto.randomUUID().slice(0, 8)}`;
}

export function customToCharacter(draft: CustomAgentDraft): Character {
  const t = ARCHETYPE_TEMPLATES[draft.archetype];
  const persona = draft.generatedPersona;
  const topicReactions = persona?.topicReactions ??
    Object.fromEntries(draft.topicTriggers.map((topicId) => [topicId, `（${topicId} 是我的雷区）`]));

  return {
    id: draft.id,
    name: draft.name,
    chineseName: draft.name,
    flag: draft.flag || "🎭",
    tagline: draft.tagline || ARCHETYPE_TEMPLATES[draft.archetype].suggestedTopics.join(" · "),
    chineseTagline: draft.chineseTagline || draft.name,
    gradient: "from-violet-800 to-rose-900",
    traits: [draft.archetype, "custom"],
    dietary: draft.alcoholAllergy ? ["no-alcohol"] : [],
    restrictions: draft.alcoholAllergy ? ["酒精过敏"] : [],
    personality: persona?.personality ?? draft.personality,
    speakingStyle: persona?.speakingStyle ?? draft.speakingStyle,
    messageSamples: persona?.messageSamples ?? [
      `${draft.name} arrived — custom agent.`,
      "这锅有点意思。",
      "我先看看你们怎么捞。",
    ],
    foodReactions: {
      beef: ["熟了，我出手。"],
      shrimp: ["快！这个秒数我记住了。"],
    },
    foodReactionDefault: ["可以捞了。", "别抢不过我就行。"],
    drinkLines: persona?.drinkLines ?? (draft.alcoholAllergy ? ["我不能喝！"] : ["*举杯* 来。"]),
    drinkBoastLines: persona?.drinkBoastLines ?? ["你敢跟我拼？"],
    drinkDownLines: persona?.drinkDownLines ?? ["……下次……"],
    topicReactions,
    alcoholAllergy: draft.alcoholAllergy,
    drinkingPower: draft.drinkingPowerOverride ?? t.drinkingPower,
    skills: skillsForArchetype(draft.id, draft.archetype),
    weaknessTopic: persona?.weaknessTopic ?? draft.topicTriggers[0] ?? "food",
    weaknessDescription:
      persona?.weaknessDescription ?? `被 ${draft.topicTriggers[0] ?? "food"} 话题击中后节奏会乱`,
    strengthDescription: persona?.strengthDescription ?? "自定义角色，总能带来一点饭桌变数",
  };
}

/** Grab speed stored separately (Character type has no field) */
export function customGrabSpeed(draft: CustomAgentDraft): number {
  return grabSpeedFromTier(ARCHETYPE_TEMPLATES[draft.archetype].grabTier);
}

export function topicRulesForCustom(draft: CustomAgentDraft): Partial<Record<string, TopicStatusRule>> {
  const rules: Partial<Record<string, TopicStatusRule>> = {};
  for (const topicId of draft.topicTriggers) {
    const effect =
      topicId === "alcohol" && draft.alcoholAllergy
        ? "frozen"
        : topicId === "politics" || topicId === "seniority"
          ? "angry"
          : "distracted";
    rules[topicId] = {
      effect,
      chance: effect === "frozen" ? 0.95 : 0.75,
      durationSec: effect === "distracted" ? 10 : 12,
      reasonCN: `自定义弱点：${topicId}`,
    };
  }
  return rules;
}

export function loadCustomAgents(): CustomAgentDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_AGENTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomAgentDraft[];
  } catch {
    return [];
  }
}

export function saveCustomAgent(draft: CustomAgentDraft): void {
  const list = loadCustomAgents().filter((a) => a.id !== draft.id);
  list.push(draft);
  localStorage.setItem(CUSTOM_AGENTS_STORAGE_KEY, JSON.stringify(list));
}

export function deleteCustomAgent(id: string): void {
  const list = loadCustomAgents().filter((a) => a.id !== id);
  localStorage.setItem(CUSTOM_AGENTS_STORAGE_KEY, JSON.stringify(list));
}

export function saveSessionCustomAgents(sessionId: string, drafts: CustomAgentDraft[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_CUSTOM_KEY(sessionId), JSON.stringify(drafts));
}

export function loadSessionCustomAgents(sessionId: string): CustomAgentDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSION_CUSTOM_KEY(sessionId));
    if (!raw) return [];
    return JSON.parse(raw) as CustomAgentDraft[];
  } catch {
    return [];
  }
}

export function validateDraft(draft: Omit<CustomAgentDraft, "id" | "createdAt">): BalanceValidation {
  return validateCustomBalance(draft.archetype, draft.topicTriggers, draft.alcoholAllergy);
}

export function createDraftFromForm(
  form: Omit<CustomAgentDraft, "id" | "createdAt">,
): { draft: CustomAgentDraft | null; error?: string } {
  const v = validateDraft(form);
  if (!v.ok) return { draft: null, error: v.message };
  return {
    draft: {
      ...form,
      id: newCustomAgentId(),
      createdAt: new Date().toISOString(),
    },
  };
}
