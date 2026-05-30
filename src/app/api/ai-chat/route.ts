import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";
import { CHARACTER_MAP } from "@/lib/characters";

ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { guestId, context, trigger } = body as {
    guestId: string;
    context: string;   // last few messages for context
    trigger: string;   // what prompted this message
  };

  const char = CHARACTER_MAP[guestId];
  if (!char) return Response.json({ error: "Unknown guest" }, { status: 400 });

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

  try {
    const result = await ai.chat({
      model: "deepseek.v3.1",
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 120,
      temperature: 0.9,
    });

    const text = result.choices[0]?.message?.content?.trim() ?? "";
    return Response.json({ text });
  } catch (err) {
    console.error("AI chat error:", err);
    // Fallback to a sample line if AI fails
    const fallback = char.messageSamples[Math.floor(Math.random() * char.messageSamples.length)];
    return Response.json({ text: fallback });
  }
}
