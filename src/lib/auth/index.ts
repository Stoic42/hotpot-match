import { NextRequest, NextResponse } from "next/server";

/** Simplified user type for anonymous client identification. */
export interface ClientUser {
  id: string;
  displayName?: string | null;
}

/**
 * Extract client identity from the request header.
 * Replaces the Eazo requireAuth() pattern.
 *
 * The client sends a UUID stored in localStorage as `x-client-id`.
 * If missing, returns a 401.
 */
export function getClientId(request: NextRequest): { ok: true; clientId: string } | { ok: false; response: Response } {
  const clientId = request.headers.get("x-client-id");
  if (!clientId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing x-client-id header" }, { status: 401 }),
    };
  }
  return { ok: true, clientId };
}
