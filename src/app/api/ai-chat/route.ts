import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getClientId } from "@/lib/auth";
import { CHARACTER_MAP } from "@/lib/characters";
import { buildAgentPrompt } from "@/lib/ai/agent-prompts";
import {
  neutralAgentTurn,
  parseAgentTurnPayload,
  parseDrinkAgentPayload,
  type AgentMode,
} from "@/lib/ai/agent-types";

const TIMEOUT_MS = 15_000;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.DEEPSEEK_API_KEY) return null;
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
      dangerouslyAllowBrowser: true,
    });
  }
  return _openai;
}

async function callWithRetry(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  retries = 1,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = getOpenAI();
  if (!client) throw new Error("DEEPSEEK_API_KEY not configured");
  try {
    return await client.chat.completions.create(params, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (retries > 0) {
      console.warn("[ai-chat] Retrying after error:", err);
      return callWithRetry(params, retries - 1);
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  const auth = getClientId(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { guestId, context, trigger, mode = "chat", defaultTargetGuestId } = body as {
    guestId: string;
    context: string;
    trigger: string;
    mode?: AgentMode;
    defaultTargetGuestId?: string;
  };

  const char = CHARACTER_MAP[guestId];
  if (!char) {
    return NextResponse.json({ error: "Unknown guest" }, { status: 400 });
  }

  const safeMode: AgentMode =
    mode === "topic" || mode === "scramble" || mode === "drink" ? mode : "chat";
  const fallbackText = char.messageSamples[0] ?? "...";
  const prompt = buildAgentPrompt(char, safeMode, context, trigger);

  if (!getOpenAI()) {
    return NextResponse.json(
      { ...neutralAgentTurn(fallbackText), error: "AI not configured" },
      { status: 503 },
    );
  }

  const useJson = safeMode !== "chat";

  try {
    const result = await callWithRetry({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: useJson ? 200 : 120,
      temperature: 0.85,
      ...(useJson ? { response_format: { type: "json_object" as const } } : {}),
    });

    const raw = result.choices[0]?.message?.content?.trim() ?? "";

    if (!useJson) {
      return NextResponse.json({
        text: raw || fallbackText,
        emotion: "neutral",
        emotionSeconds: 0,
        emotionReason: "",
        agent: true,
      });
    }

    if (safeMode === "drink") {
      const turn = parseDrinkAgentPayload(
        raw,
        fallbackText,
        defaultTargetGuestId ?? guestId,
      );
      return NextResponse.json(turn);
    }

    const turn = parseAgentTurnPayload(raw, fallbackText);
    return NextResponse.json(turn);
  } catch (err) {
    console.error("[ai-chat]", err);
    return NextResponse.json(
      { ...neutralAgentTurn(fallbackText), error: "AI request failed" },
      { status: 502 },
    );
  }
}
