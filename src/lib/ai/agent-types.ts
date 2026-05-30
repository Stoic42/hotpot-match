import type { StatusEffect } from "@/lib/guest-status";
import { statusLabel } from "@/lib/guest-status";
import type { GuestStatusEntry } from "@/lib/guest-status";

export type AgentMode = "chat" | "topic" | "scramble" | "drink";

export interface DrinkAgentTurn extends AgentTurn {
  damage: number;
  /** guest id who loses HP */
  targetGuestId: string;
}

export type AgentEmotion = StatusEffect | "neutral";

export interface AgentTurn {
  text: string;
  emotion: AgentEmotion;
  emotionSeconds: number;
  emotionReason: string;
  agent: boolean;
}

export interface AgentTurnPayload {
  text?: string;
  emotion?: string;
  emotionSeconds?: number;
  emotionReason?: string;
  damage?: number;
  targetGuestId?: string;
}

const VALID_EMOTIONS = new Set<string>(["neutral", "angry", "frozen", "distracted"]);

export function parseAgentTurnPayload(raw: string, fallbackText: string): AgentTurn {
  const trimmed = raw.trim();
  let payload: AgentTurnPayload | null = null;

  const jsonStart = trimmed.indexOf("{");
  if (jsonStart >= 0) {
    try {
      payload = JSON.parse(trimmed.slice(jsonStart)) as AgentTurnPayload;
    } catch {
      payload = null;
    }
  }

  const text = (payload?.text ?? trimmed).trim() || fallbackText;
  let emotion: AgentEmotion = "neutral";
  if (payload?.emotion && VALID_EMOTIONS.has(payload.emotion)) {
    emotion = payload.emotion as AgentEmotion;
  }

  const emotionSeconds = clamp(
    typeof payload?.emotionSeconds === "number" ? payload.emotionSeconds : 12,
    0,
    25,
  );

  const emotionReason =
    (payload?.emotionReason ?? "").trim() ||
    (emotion !== "neutral" ? `Agent：${statusLabel(emotion as StatusEffect)}` : "");

  return { text, emotion, emotionSeconds, emotionReason, agent: true };
}

export function guestStatusFromAgentTurn(
  turn: Pick<AgentTurn, "emotion" | "emotionSeconds" | "emotionReason">,
  nowMs: number,
): GuestStatusEntry | null {
  if (turn.emotion === "neutral" || turn.emotionSeconds <= 0) return null;
  return {
    effect: turn.emotion,
    untilMs: nowMs + turn.emotionSeconds * 1000,
    reasonCN: turn.emotionReason || statusLabel(turn.emotion),
  };
}

export function neutralAgentTurn(fallbackText: string): AgentTurn {
  return {
    text: fallbackText,
    emotion: "neutral",
    emotionSeconds: 0,
    emotionReason: "",
    agent: false,
  };
}

export function parseDrinkAgentPayload(
  raw: string,
  fallbackText: string,
  defaultTargetId: string,
): DrinkAgentTurn {
  const base = parseAgentTurnPayload(raw, fallbackText);
  const jsonStart = raw.indexOf("{");
  let damage = 12;
  let targetGuestId = defaultTargetId;
  if (jsonStart >= 0) {
    try {
      const p = JSON.parse(raw.slice(jsonStart)) as AgentTurnPayload;
      if (typeof p.damage === "number") damage = clamp(p.damage, 0, 35);
      if (p.targetGuestId) targetGuestId = p.targetGuestId;
    } catch {
      /* keep defaults */
    }
  }
  return { ...base, damage, targetGuestId, agent: true };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
