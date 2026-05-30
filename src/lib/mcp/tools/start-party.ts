import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSession, getActiveSession, endSession } from "@/lib/db/queries/sessions";
import { CHARACTERS } from "@/lib/characters";

export function registerStartParty(server: McpServer, userId: string) {
  server.registerTool(
    "start_party",
    {
      description:
        "Start a new hotpot party session with a chosen set of characters. Ends any existing active session. Returns the new session ID to use with get_feed.",
      inputSchema: {
        guest_ids: z
          .array(z.string())
          .min(1)
          .max(5)
          .describe(
            "List of character IDs to invite. Valid IDs: chen, leo, youwei, zion, marta, nina"
          ),
      },
    },
    async ({ guest_ids }) => {
      const validIds = guest_ids.filter((id) => CHARACTERS.find((c) => c.id === id));
      if (validIds.length === 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No valid guest IDs. Valid options: chen, leo, youwei, zion, marta, nina",
            },
          ],
        };
      }

      const existing = await getActiveSession(userId);
      if (existing) await endSession(existing.id);

      const session = await createSession(userId, validIds);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                session_id: session.id,
                guests: validIds,
                message: `Party started with ${validIds.length} guests. Use get_feed with session_id=${session.id} to see messages.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
