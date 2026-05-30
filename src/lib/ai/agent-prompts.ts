import type { Character } from "@/lib/characters";
import type { AgentMode } from "@/lib/ai/agent-types";

export function buildAgentPrompt(
  char: Character,
  mode: AgentMode,
  context: string,
  trigger: string,
): string {
  const base = `You are ${char.name}, a character at a Chinese hotpot dinner party (one-minute round).

Personality: ${char.personality}
Speaking style: ${char.speakingStyle}
Traits: ${char.traits.join(", ")}
${char.restrictions.length > 0 ? `Dietary restrictions: ${char.restrictions.join(", ")}` : ""}
${char.alcoholAllergy ? "IMPORTANT: You are severely allergic to alcohol." : ""}
Drinking power (1-10): ${char.drinkingPower}

Table context: ${context}
Event: ${trigger}`;

  if (mode === "chat") {
    return `${base}

Reply in character. 1-3 short sentences. No name prefix.
Output plain text only (not JSON).`;
  }

  const jsonRules = `
Output ONLY valid JSON (no markdown):
{
  "text": "what you say at the table (1-3 sentences, in character)",
  "emotion": "neutral" | "angry" | "frozen" | "distracted",
  "emotionSeconds": 0-20,
  "emotionReason": "short Chinese reason shown to players"
}

Emotion rules (game mechanics):
- "angry" or "frozen": you CANNOT grab food with chopsticks until emotionSeconds elapses (refuse to compete).
- "distracted": you CAN grab but you are slow / not focused (rambling, triggered topic).
- "neutral": emotionSeconds must be 0 — you are fine to grab.
Stay in character; pick emotion only when THIS topic truly hits your buttons (do not always rage).`;

  if (mode === "topic") {
    return `${base}
${jsonRules}

A controversial TOPIC just dominated the table. React and decide if you are too angry, stunned, or distracted to grab food this round.`;
  }

  if (mode === "drink") {
    return `${base}
Output ONLY valid JSON:
{
  "text": "trash talk or reaction (1-2 sentences)",
  "damage": 5-28,
  "targetGuestId": "id of guest who drinks and loses HP (usually the defender)",
  "emotion": "neutral" | "angry" | "frozen" | "distracted",
  "emotionSeconds": 0-15,
  "emotionReason": "why they cannot grab food after this drink"
}
Rules:
- damage scales with your drinkingPower and how hard you press the attack.
- If allergic to alcohol, damage 0 and comedic refusal in text.
- targetGuestId must be the person who is drinking as a result of YOUR attack.
- emotion on defender if they are overwhelmed (optional).`;
  }

  return `${base}
${jsonRules}

Food is READY — everyone scrambles to grab ${trigger}.
Say your line as you try (or refuse) to grab. If still angry/frozen from earlier drama, say so and set emotion accordingly.`;
}
