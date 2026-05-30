import { describe, expect, test, mock } from "bun:test";
import { NextRequest } from "next/server";

// Mock auth module with new getClientId signature
mock.module("@/lib/auth", () => ({
  getClientId: (req: NextRequest) => {
    const header = req.headers.get("x-client-id");
    if (!header || header === "fail") {
      return { ok: false, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
    }
    return { ok: true, clientId: "test-client-123" };
  },
}));

const mockSession = {
  id: 1,
  userId: "test-client-123",
  guestIds: ["chen", "leo"],
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

mock.module("@/lib/db/queries/sessions", () => ({
  createSession: mock().mockResolvedValue(mockSession),
  getActiveSession: mock().mockResolvedValue(null),
  endSession: mock().mockResolvedValue(undefined),
  getMessages: mock().mockResolvedValue([]),
  addMessage: mock().mockResolvedValue({
    id: 1, sessionId: 1, guestId: "chen", content: "test", messageType: "chat", createdAt: new Date().toISOString(),
  }),
}));

import { POST, GET } from "@/app/api/sessions/route";

function buildRequest(url: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  const headers = new Headers(options?.headers);
  headers.set("content-type", "application/json");
  if (options?.headers?.["x-client-id"] === undefined) {
    headers.set("x-client-id", "test-client-123");
  }
  return new NextRequest(url, { method: options?.method ?? "GET", headers, body: options?.body ? JSON.stringify(options.body) : undefined });
}

describe("POST /api/sessions", () => {
  test("returns 201 when creating session with valid guest IDs", async () => {
    const req = buildRequest("http://localhost/api/sessions", { method: "POST", body: { guestIds: ["chen", "leo"] } });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.guestIds).toEqual(["chen", "leo"]);
  });

  test("returns 400 when guestIds is empty", async () => {
    const req = buildRequest("http://localhost/api/sessions", { method: "POST", body: { guestIds: [] } });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 when guestIds is missing", async () => {
    const req = buildRequest("http://localhost/api/sessions", { method: "POST", body: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("returns 401 when auth fails", async () => {
    const req = buildRequest("http://localhost/api/sessions", { method: "POST", body: { guestIds: ["chen"] }, headers: { "x-client-id": "fail" } });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/sessions", () => {
  test("returns null when no active session", async () => {
    const req = buildRequest("http://localhost/api/sessions");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toBeNull();
  });

  test("returns 401 when auth fails", async () => {
    const req = buildRequest("http://localhost/api/sessions", { headers: { "x-client-id": "fail" } });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
