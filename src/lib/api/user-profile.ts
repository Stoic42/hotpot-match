import type { ClientUser } from "@/lib/auth";
import { request } from "./request";

export async function fetchUserProfile(): Promise<ClientUser | null> {
  try {
    const res = await request("/api/user/profile");
    if (!res.ok) return null;
    const json = (await res.json()) as ClientUser;
    return json.id ? json : null;
  } catch {
    return null;
  }
}
