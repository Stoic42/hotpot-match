import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getMessages } from "@/lib/db/queries/sessions";
import { CHARACTER_MAP } from "@/lib/characters";

export function registerGetFeed(server: McpServer, _userId: string) {
  server.registerTool(
    "get_feed",
    {
      description:
        "Retrieve the message feed for a hotpot party session. Returns messages in chronological order with character names and content.",
      inputSchema: {
        session_id: z.number().int().positive().describe("The session ID from start_party"),
      },
    },
    async ({ session_id }) => {
      const msgs = await getMessages(session_id);
      const feed = msgs.reverse().map((m) => {
        const char = CHARACTER_MAP[m.guestId];
        return {
          id: m.id,
          guest: char ? `${char.flag} ${char.name}` : m.guestId,
          message: m.content,
          type: m.messageType,
          timestamp: m.createdAt,
        };
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ session_id, message_count: feed.length, feed }, null, 2),
          },
        ],
      };
    }
  );
}
