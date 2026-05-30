import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CHARACTERS } from "@/lib/characters";

export function registerGetCharacters(server: McpServer, _userId: string) {
  server.registerTool(
    "get_characters",
    {
      description:
        "List all available hotpot party characters with their traits, dietary restrictions, and personality descriptions. Use this to help the user pick guests before starting a party.",
    },
    async () => {
      const summary = CHARACTERS.map((c) => ({
        id: c.id,
        name: c.name,
        flag: c.flag,
        tagline: c.tagline,
        traits: c.traits,
        dietary_restrictions: c.restrictions,
        personality: c.personality,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }
  );
}
