#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import config from "./config/settings.js";
import { setupTools } from "./tools/index.js";

/**
 * Initialize the high-level MCP server. Tool capabilities are registered
 * automatically by `registerTool`, so no manual capabilities map is needed.
 */
const server = new McpServer({
  name: config.server.name,
  version: config.server.version,
});

// Register all tools on the server
setupTools(server);

// Create and connect the transport
const transport = new StdioServerTransport();

server
  .connect(transport)
  .then(() => {
    console.error(`Starwind UI MCP Server running (using stdio transport)`);
  })
  .catch(console.error);

// Handle cleanup
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
