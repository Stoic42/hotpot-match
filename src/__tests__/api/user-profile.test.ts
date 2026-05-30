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

mock.module("@/lib/db/queries/users", () => ({
  upsertUser: mock().mockResolvedValue({
    id: "test-client", name: null, email: null, avatar: null, createdAt: new Date(), updatedAt: new Date(),
  }),
}));

import { GET } from "@/app/api/user/profile/route";

describe("GET /api/user/profile", () => {
  test("returns user profile when authenticated", async () => {
    const headers = new Headers();
    headers.set("x-client-id", "test-client");
    const req = new NextRequest("http://localhost/api/user/profile", { headers });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("test-client");
  });

  test("returns 401 when auth fails", async () => {
    const req = new NextRequest("http://localhost/api/user/profile");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
