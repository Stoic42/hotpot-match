import type { TopicBomb } from "@/lib/characters";
import { TOPIC_BOMBS } from "@/lib/characters";

export type ActionCardId =
  | "card_hierarchy"
  | "card_politics"
  | "card_toast"
  | "card_distraction"
  | "card_sneak_shrimp";

export interface ActionCard {
  id: ActionCardId;
  nameCN: string;
  nameEN: string;
  emoji: string;
  description: string;
  color: string;
}

export const ACTION_CARDS: Record<ActionCardId, ActionCard> = {
  card_hierarchy: {
    id: "card_hierarchy",
    nameCN: "论资排辈",
    nameEN: "Hierarchy",
    emoji: "🎖",
    description: "强行辈分局 — 易激怒陈/ Marta",
    color: "#B45309",
  },
  card_politics: {
    id: "card_politics",
    nameCN: "政治风暴",
    nameEN: "Politics",
    emoji: "🗳",
    description: "政治话题 — 悠微/Leo 易分心",
    color: "#7C3AED",
  },
  card_toast: {
    id: "card_toast",
    nameCN: "敬酒",
    nameEN: "Toast",
    emoji: "🍻",
    description: "发动拼酒（Agent 裁判）",
    color: "#065F46",
  },
  card_distraction: {
    id: "card_distraction",
    nameCN: "插科打诨",
    nameEN: "Distraction",
    emoji: "💬",
    description: "随机 2 人分心 8 秒",
    color: "#4F46E5",
  },
  card_sneak_shrimp: {
    id: "card_sneak_shrimp",
    nameCN: "偷偷下虾滑",
    nameEN: "Sneak Shrimp",
    emoji: "🦐",
    description: "8 秒虾滑 — 打乱节奏",
    color: "#F97316",
  },
};

const DECK: ActionCardId[] = [
  "card_hierarchy",
  "card_politics",
  "card_toast",
  "card_distraction",
  "card_sneak_shrimp",
  "card_hierarchy",
  "card_politics",
];

export function dealHand(count = 3): ActionCardId[] {
  const shuffled = [...DECK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function topicForCard(cardId: ActionCardId): TopicBomb | null {
  switch (cardId) {
    case "card_hierarchy":
      return TOPIC_BOMBS.find((t) => t.id === "seniority") ?? null;
    case "card_politics":
      return TOPIC_BOMBS.find((t) => t.id === "politics") ?? null;
    default:
      return null;
  }
}
