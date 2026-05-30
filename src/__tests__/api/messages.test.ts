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

const mockMessages = [
  { id: 1, sessionId: 1, guestId: "chen", content: "这锅底不正宗。", messageType: "chat", createdAt: "2026-01-01T00:00:00Z" },
  { id: 2, sessionId: 1, guestId: "leo", content: "ok wait the beef is—", messageType: "chat", createdAt: "2026-01-01T00:00:01Z" },
];

mock.module("@/lib/db/queries/sessions", () => ({
  getMessages: mock().mockResolvedValue(mockMessages),
  addMessage: mock().mockImplementation((_sid: number, guestId: string, content: string, messageType: string) =>
    Promise.resolve({ id: 99, sessionId: _sid, guestId, content, messageType, createdAt: new Date().toISOString() })
  ),
}));

import { GET, POST } from "@/app/api/sessions/[id]/messages/route";

function buildRequest(url: string, options?: { method?: string; body?: unknown }) {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("x-client-id", "test-client");
  return new NextRequest(url, { method: options?.method ?? "GET", headers, body: options?.body ? JSON.stringify(options.body) : undefined });
}

describe("GET /api/sessions/:id/messages", () => {
  test("returns messages for valid session id", async () => {
    const req = buildRequest("http://localhost/api/sessions/1/messages");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
  });

  test("returns 400 for invalid session id", async () => {
    const req = buildRequest("http://localhost/api/sessions/abc/messages");
    const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  test("returns 401 when no client id", async () => {
    const headers = new Headers();
    headers.set("content-type", "application/json");
    const req = new NextRequest("http://localhost/api/sessions/1/messages", { headers });
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/sessions/:id/messages", () => {
  test("returns 201 when adding a valid message", async () => {
    const req = buildRequest("http://localhost/api/sessions/1/messages", {
      method: "POST", body: { guestId: "chen", content: "测试消息", messageType: "chat" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.guestId).toBe("chen");
  });

  test("returns 400 when guestId is missing", async () => {
    const req = buildRequest("http://localhost/api/sessions/1/messages", {
      method: "POST", body: { content: "no guest" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  test("returns 400 when content is missing", async () => {
    const req = buildRequest("http://localhost/api/sessions/1/messages", {
      method: "POST", body: { guestId: "chen" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid session id", async () => {
    const req = buildRequest("http://localhost/api/sessions/abc/messages", {
      method: "POST", body: { guestId: "chen", content: "test" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  test("returns 401 when no client id", async () => {
    const headers = new Headers();
    headers.set("content-type", "application/json");
    const req = new NextRequest("http://localhost/api/sessions/1/messages", {
      method: "POST", headers, body: JSON.stringify({ guestId: "chen", content: "test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });
});
