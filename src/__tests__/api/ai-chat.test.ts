import { describe, expect, test, mock } from "bun:test";
import { NextRequest } from "next/server";

mock.module("@/lib/auth", () => ({
  getClientId: (req: NextRequest) => {
    const header = req.headers.get("x-client-id");
    if (!header) {
      return { ok: false, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
    }
    return { ok: true, clientId: header };
  },
}));

import { POST } from "@/app/api/ai-chat/route";

function buildRequest(body: unknown, clientId = "test-client") {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("x-client-id", clientId);
  return new NextRequest("http://localhost/api/ai-chat", {
    method: "POST", headers, body: JSON.stringify(body),
  });
}

describe("POST /api/ai-chat", () => {
  test("returns 400 for unknown guest id", async () => {
    const req = buildRequest({ guestId: "nonexistent", context: "test", trigger: "test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("returns 401 when no client id", async () => {
    const headers = new Headers();
    headers.set("content-type", "application/json");
    const req = new NextRequest("http://localhost/api/ai-chat", {
      method: "POST", headers, body: JSON.stringify({ guestId: "chen", context: "test", trigger: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
