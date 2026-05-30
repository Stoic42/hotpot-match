import { request } from "@/lib/api/request";
import type { GeneratedPersona } from "@/lib/db/schema/custom-guests";

export interface CreateCustomGuestRequest {
  name: string;
  flag: string;
  gradient: string;
  bio: string;
  traits: string[];
  dietary: string[];
  drinkingPower: number;
}

export interface CustomGuestResponse extends CreateCustomGuestRequest {
  id: number;
  userId: string;
  generatedPersona: GeneratedPersona | null;
  createdAt: string;
}

export async function createCustomGuestProfile(
  input: CreateCustomGuestRequest,
): Promise<CustomGuestResponse> {
  const res = await request("/api/custom-guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error.error ?? "Failed to create custom guest");
  }
  const data = await res.json() as { guest: CustomGuestResponse };
  return data.guest;
}
