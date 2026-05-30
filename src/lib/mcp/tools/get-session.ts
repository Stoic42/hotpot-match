import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getActiveSession } from "@/lib/db/queries/sessions";
import { CHARACTER_MAP } from "@/lib/characters";

export function registerGetSession(server: McpServer, userId: string) {
  server.registerTool(
    "get_session",
    {
      description:
        "Get the current active hotpot party session for the authenticated user, including the guest list and session ID.",
    },
    async () => {
      const session = await getActiveSession(userId);
      if (!session) {
        return {
          content: [
            {
              type: "text",
              text: "No active party session. Use start_party to begin one.",
            },
          ],
        };
      }
      const guestIds = session.guestIds as string[];
      const guests = guestIds
        .map((id) => CHARACTER_MAP[id])
        .filter(Boolean)
        .map((c) => ({ id: c!.id, name: c!.name, flag: c!.flag }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ session_id: session.id, status: session.status, guests }, null, 2),
          },
        ],
      };
    }
  );
}
