import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getActiveSession, endSession } from "@/lib/db/queries/sessions";

export function registerEndParty(server: McpServer, userId: string) {
  server.registerTool(
    "end_party",
    {
      description: "End the current active hotpot party session.",
    },
    async () => {
      const session = await getActiveSession(userId);
      if (!session) {
        return {
          content: [{ type: "text", text: "No active party session to end." }],
        };
      }
      await endSession(session.id);
      return {
        content: [
          {
            type: "text",
            text: `Party session ${session.id} ended. Thanks for the chaos! 干杯！`,
          },
        ],
      };
    }
  );
}
