import { describe, expect, test } from "bun:test";
import {
  guestStatusFromAgentTurn,
  parseAgentTurnPayload,
} from "@/lib/ai/agent-types";

describe("parseAgentTurnPayload", () => {
  test("parses JSON emotion from model output", () => {
    const turn = parseAgentTurnPayload(
      JSON.stringify({
        text: "这话题过分了。",
        emotion: "angry",
        emotionSeconds: 14,
        emotionReason: "被冒犯",
      }),
      "fallback",
    );
    expect(turn.text).toBe("这话题过分了。");
    expect(turn.emotion).toBe("angry");
    expect(turn.emotionSeconds).toBe(14);
    expect(turn.agent).toBe(true);
  });

  test("guestStatusFromAgentTurn maps angry to block window", () => {
    const t = 1_000_000;
    const status = guestStatusFromAgentTurn(
      { emotion: "frozen", emotionSeconds: 10, emotionReason: "吓呆" },
      t,
    );
    expect(status?.effect).toBe("frozen");
    expect(status?.untilMs).toBe(t + 10_000);
  });
});
