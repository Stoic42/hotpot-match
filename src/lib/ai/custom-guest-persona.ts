import OpenAI from "openai";
import type { GeneratedPersona } from "@/lib/db/schema/custom-guests";

const TOPIC_IDS = ["spice", "politics", "anime", "food", "alcohol", "seafood", "hierarchy"];
const TIMEOUT_MS = 15_000;

export interface CustomGuestPersonaInput {
  name: string;
  bio: string;
  traits: string[];
  dietary: string[];
  drinkingPower: number;
}

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.DEEPSEEK_API_KEY) return null;
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
  }
  return openai;
}

function buildPrompt(input: CustomGuestPersonaInput): string {
  return `You are a character designer for a chaotic Chinese hotpot dinner party simulator.
Given a brief user-submitted persona, expand it into a vivid playable guest.

Guest submitted:
- Name: ${input.name}
- Personality bio: "${input.bio}"
- Traits: ${input.traits.join(", ") || "none"}
- Dietary restrictions: ${input.dietary.join(", ") || "none"}
- Drinking power (1-10): ${input.drinkingPower}

Return ONLY valid JSON with this exact structure:
{
  "personality": "3-4 sentence character brief for an AI actor playing this person at hotpot.",
  "speakingStyle": "One sentence describing pace, vocabulary, and mannerisms.",
  "messageSamples": ["line 1", "line 2", "line 3", "line 4"],
  "drinkLines": ["line 1", "line 2", "line 3"],
  "drinkBoastLines": ["line 1", "line 2"],
  "drinkDownLines": ["line 1"],
  "topicReactions": {
    "spice": "reaction",
    "politics": "reaction",
    "anime": "reaction",
    "food": "reaction",
    "alcohol": "reaction",
    "seafood": "reaction",
    "hierarchy": "reaction"
  },
  "weaknessTopic": "one of: spice|politics|anime|food|alcohol|seafood|hierarchy",
  "weaknessDescription": "1 sentence weakness effect",
  "strengthDescription": "1 sentence drinking battle advantage"
}

Keep dialogue short, specific, bilingual when natural, and slightly chaotic.`;
}

export function fallbackPersona(input: CustomGuestPersonaInput): GeneratedPersona {
  return {
    personality: `${input.name} joins the hotpot table. ${input.bio}`,
    speakingStyle: "Conversational, watchful, and a little nervous when the table gets loud.",
    messageSamples: [
      "这个锅底有点东西。",
      "我先观察一轮，你们别太快。",
      "等一下，这个话题突然危险了。",
      "可以，我跟。",
    ],
    drinkLines: ["来就来。", "这杯算我的。", "我还能撑。"],
    drinkBoastLines: ["别小看我。", "这桌我不会第一个倒。"],
    drinkDownLines: ["……下次换我选锅底。"],
    topicReactions: {
      spice: "辣度一上来，表情立刻变认真。",
      politics: "试图转移话题，但明显已经被点燃。",
      anime: "突然接梗，语速变快。",
      food: "开始认真评价每一种蘸料。",
      alcohol: "嘴上说可以，手已经慢了半拍。",
      seafood: "盯着锅里浮起来的虾滑。",
      hierarchy: "开始计算谁该先夹菜。",
    },
    weaknessTopic: "food",
    weaknessDescription: "Food arguments make them overexplain and lose tempo.",
    strengthDescription: "Careful pacing keeps them alive longer than expected.",
  };
}

export async function generateCustomGuestPersona(
  input: CustomGuestPersonaInput,
): Promise<GeneratedPersona> {
  const client = getOpenAI();
  if (!client) return fallbackPersona(input);

  try {
    const result = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: buildPrompt(input) }],
      max_tokens: 900,
      temperature: 0.9,
      response_format: { type: "json_object" },
    }, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = result.choices[0]?.message?.content?.trim() ?? "{}";
    const persona = JSON.parse(raw) as GeneratedPersona;
    if (!TOPIC_IDS.includes(persona.weaknessTopic)) persona.weaknessTopic = "food";
    return persona;
  } catch {
    return fallbackPersona(input);
  }
}
