import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getClientId } from "@/lib/auth";
import { CHARACTER_MAP } from "@/lib/characters";

const TIMEOUT_MS = 15_000;

/**
 * Lazy-initialize the OpenAI client so the build doesn't fail
 * when DEEPSEEK_API_KEY is not set in the build environment.
 */
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
      // Safe: this route only runs server-side (Next.js API route).
      dangerouslyAllowBrowser: true,
    });
  }
  return _openai;
}

async function callWithRetry(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  retries = 1,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await getOpenAI().chat.completions.create(params, {
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
  const { guestId, context, trigger } = body as {
    guestId: string;
    context: string;
    trigger: string;
  };

  const char = CHARACTER_MAP[guestId];
  if (!char) {
    return NextResponse.json({ error: "Unknown guest" }, { status: 400 });
  }

  const systemPrompt = `You are ${char.name}, a character at a Chinese hotpot dinner party.

Personality: ${char.personality}
Speaking style: ${char.speakingStyle}
Traits: ${char.traits.join(", ")}
${char.restrictions.length > 0 ? `Dietary restrictions: ${char.restrictions.join(", ")}` : ""}
${char.alcoholAllergy ? "IMPORTANT: You are severely allergic to alcohol. React with panic/alarm if alcohol is nearby." : ""}

Rules:
- Stay fully in character. Every message must sound like ONLY ${char.name} would say it.
- Keep responses SHORT — 1-3 sentences maximum. This is a dinner table conversation.
- Respond to the current trigger/context naturally.
- Do NOT use asterisks for actions unless the character's style does (*like this*).
- Do NOT start with the character's own name.
- Be specific, reactive, and vivid. No generic filler.

Current dinner context: ${context}
What just happened / what to react to: ${trigger}

Write ONLY ${char.name}'s response. Nothing else.`;

  const result = await callWithRetry({
    model: "deepseek-chat",
    messages: [{ role: "user", content: systemPrompt }],
    max_tokens: 120,
    temperature: 0.9,
  });

  const text = result.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ text });
}
