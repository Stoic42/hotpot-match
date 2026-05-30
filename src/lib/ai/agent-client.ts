import { request } from "@/lib/api/request";
import type { AgentMode, AgentTurn, DrinkAgentTurn } from "@/lib/ai/agent-types";
import { neutralAgentTurn } from "@/lib/ai/agent-types";

export interface FetchAgentTurnParams {
  guestId: string;
  mode: AgentMode;
  context: string;
  trigger: string;
  fallbackText: string;
  defaultTargetGuestId?: string;
}

export interface FetchDrinkJudgmentParams {
  guestId: string;
  context: string;
  trigger: string;
  fallbackText: string;
  defaultTargetGuestId?: string;
}

export async function fetchAgentTurn(params: FetchAgentTurnParams): Promise<AgentTurn> {
  const { guestId, mode, context, trigger, fallbackText } = params;
  try {
    const res = await request("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId,
        context,
        trigger,
        mode,
        defaultTargetGuestId: params.defaultTargetGuestId,
      }),
    });
    const data = (await res.json()) as AgentTurn & {
      error?: string;
      damage?: number;
      targetGuestId?: string;
    };
    if (!res.ok) {
      return neutralAgentTurn(fallbackText);
    }
    const base = {
      text: data.text || fallbackText,
      emotion: data.emotion ?? "neutral",
      emotionSeconds: data.emotionSeconds ?? 0,
      emotionReason: data.emotionReason ?? "",
      agent: data.agent !== false,
    };
    if (mode === "drink") {
      return {
        ...base,
        damage: typeof data.damage === "number" ? data.damage : 12,
        targetGuestId: data.targetGuestId ?? params.defaultTargetGuestId ?? guestId,
      } as DrinkAgentTurn;
    }
    return base;
  } catch {
    return neutralAgentTurn(fallbackText);
  }
}

export async function fetchDrinkJudgment(
  params: FetchDrinkJudgmentParams,
): Promise<DrinkAgentTurn> {
  const turn = (await fetchAgentTurn({ ...params, mode: "drink" })) as DrinkAgentTurn;
  return {
    ...turn,
    damage: turn.damage ?? 10,
    targetGuestId: turn.targetGuestId ?? params.defaultTargetGuestId ?? params.guestId,
  };
}
