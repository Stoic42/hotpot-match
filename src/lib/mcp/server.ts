import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetCharacters } from "./tools/get-characters";
import { registerStartParty } from "./tools/start-party";
import { registerGetFeed } from "./tools/get-feed";
import { registerGetSession } from "./tools/get-session";
import { registerEndParty } from "./tools/end-party";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "hotpot-party",
    version: "1.0.0",
  });

  registerGetCharacters(server, userId);
  registerStartParty(server, userId);
  registerGetFeed(server, userId);
  registerGetSession(server, userId);
  registerEndParty(server, userId);

  return server;
}
