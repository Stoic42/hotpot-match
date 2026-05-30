/**
 * Per-character topic → status (angry / frozen / distracted).
 * Not every guest on every topic — avoids "press button → everyone stunned".
 */

export type StatusEffect = "angry" | "frozen" | "distracted";

export interface GuestStatusEntry {
  effect: StatusEffect;
  untilMs: number;
  reasonCN: string;
}

export interface TopicStatusRule {
  effect: StatusEffect;
  /** 0–1, rolled when topic bomb closes */
  chance: number;
  durationSec: number;
  reasonCN: string;
}

/** guestId → topicId → rule */
export const GUEST_TOPIC_STATUS: Partial<
  Record<string, Partial<Record<string, TopicStatusRule>>>
> = {
  chen: {
    politics: {
      effect: "angry",
      chance: 0.85,
      durationSec: 14,
      reasonCN: "火锅桌上谈政治——陈师傅暴怒，这轮只骂不夹",
    },
    seniority: {
      effect: "angry",
      chance: 0.7,
      durationSec: 12,
      reasonCN: "论资排辈被挑战，面子挂不住",
    },
  },
  youwei: {
    politics: {
      effect: "distracted",
      chance: 0.92,
      durationSec: 16,
      reasonCN: "政论模式开启，筷子掉队",
    },
    alcohol: {
      effect: "frozen",
      chance: 1,
      durationSec: 18,
      reasonCN: "酒精过敏，手抖无法夹菜",
    },
  },
  leo: {
    politics: {
      effect: "distracted",
      chance: 0.55,
      durationSec: 10,
      reasonCN: "思维跳到纪录片，忘了抢菜",
    },
    anime: {
      effect: "distracted",
      chance: 0.8,
      durationSec: 12,
      reasonCN: "二次元开关打开，筷子失踪",
    },
  },
  zion: {
    politics: {
      effect: "frozen",
      chance: 0.75,
      durationSec: 12,
      reasonCN: "话题太硬，选择装死不夹",
    },
    spice: {
      effect: "frozen",
      chance: 0.5,
      durationSec: 10,
      reasonCN: "被辣懵，不敢伸筷子",
    },
  },
  marta: {
    seniority: {
      effect: "angry",
      chance: 0.72,
      durationSec: 13,
      reasonCN: "辈分局压力，气得不想动筷",
    },
    food: {
      effect: "distracted",
      chance: 0.45,
      durationSec: 8,
      reasonCN: "开始捍卫家乡菜，分心",
    },
  },
  nina: {
    alcohol: {
      effect: "angry",
      chance: 0.65,
      durationSec: 11,
      reasonCN: "酒局压迫感，赌气不夹",
    },
    spice: {
      effect: "frozen",
      chance: 0.4,
      durationSec: 9,
      reasonCN: "辣度评价引战，僵住",
    },
  },
};

export const STATUS_BLOCK_LINES: Partial<
  Record<string, Partial<Record<StatusEffect, string[]>>>
> = {
  chen: {
    angry: ["这轮我不夹。你们先吃着。", "气饱了，筷子放下。"],
    frozen: ["……"],
  },
  youwei: {
    distracted: ["等等我先说完葛兰西——啊菜没了？！", "政论要紧，筷子次要。"],
    frozen: ["我手在抖，别逼我夹生的！", "酒精味过来我就废了，这轮不夹。"],
  },
  leo: {
    distracted: ["wait where was I— oh the beef— TOO LATE—", "sorry I was thinking about eels—"],
  },
  zion: {
    frozen: ["I'm... not emotionally ready to use chopsticks.", "Let me process that topic first."],
  },
  marta: {
    angry: ["In Russia we also have hierarchy. I am upset. No chopsticks.", "This is disrespect. I do not grab."],
  },
  nina: {
    angry: ["哼，你们喝你们的，我不夹。", "气死了，这轮让你们抢。"],
    frozen: ["……（默默看锅）"],
  },
};

export function isStatusBlockingGrab(
  entry: GuestStatusEntry | undefined,
  nowMs: number,
): boolean {
  if (!entry || entry.untilMs <= nowMs) return false;
  return entry.effect === "angry" || entry.effect === "frozen";
}

export function grabSpeedMultiplier(
  entry: GuestStatusEntry | undefined,
  nowMs: number,
): number {
  if (!entry || entry.untilMs <= nowMs) return 1;
  if (entry.effect === "distracted") return 0.35;
  if (entry.effect === "angry" || entry.effect === "frozen") return 0;
  return 1;
}

export function rollTopicStatusFromMap(
  rulesMap: Record<string, Partial<Record<string, TopicStatusRule>>>,
  topicId: string,
  guestIds: string[],
  nowMs: number,
): Record<string, GuestStatusEntry> {
  const next: Record<string, GuestStatusEntry> = {};
  for (const guestId of guestIds) {
    const rule = rulesMap[guestId]?.[topicId];
    if (!rule || Math.random() > rule.chance) continue;
    next[guestId] = {
      effect: rule.effect,
      untilMs: nowMs + rule.durationSec * 1000,
      reasonCN: rule.reasonCN,
    };
  }
  return next;
}

export function rollTopicStatusEffects(
  topicId: string,
  guestIds: string[],
  nowMs: number,
): Record<string, GuestStatusEntry> {
  return rollTopicStatusFromMap(
    GUEST_TOPIC_STATUS as Record<string, Partial<Record<string, TopicStatusRule>>>,
    topicId,
    guestIds,
    nowMs,
  );
}

export function pruneGuestStatuses(
  statuses: Record<string, GuestStatusEntry>,
  nowMs: number,
): Record<string, GuestStatusEntry> {
  const out: Record<string, GuestStatusEntry> = {};
  for (const [id, s] of Object.entries(statuses)) {
    if (s.untilMs > nowMs) out[id] = s;
  }
  return out;
}

export function statusLabel(effect: StatusEffect): string {
  switch (effect) {
    case "angry":
      return "暴怒";
    case "frozen":
      return "冻结";
    case "distracted":
      return "分心";
  }
}
