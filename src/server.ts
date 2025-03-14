#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import config from "./config/settings.js";
import { tools, setupTools } from "./tools/index.js";

/**
 * Initialize the MCP server with basic capabilities
 */
// Import tools for capabilities registration
// Dynamically build capabilities object from tools map
const toolCapabilities: Record<string, any> = {};
Array.from(tools.entries()).forEach(([name, tool]) => {
	toolCapabilities[name] = {
		inputSchema: (tool as any).inputSchema,
	};
});

const server = new Server(
	{
		name: config.server.name,
		version: config.server.version,
	},
	{
		capabilities: {
			resources: {},
			tools: toolCapabilities,
		},
	},
);

// Setup tool handlers
setupTools(server);

// Create and connect the transport
const transport = new StdioServerTransport();

server
	.connect(transport)
	.then(() => {
		console.log(`Starwind UI MCP Server running (using stdio transport)`);
	})
	.catch(console.error);

// Handle cleanup
process.on("SIGINT", async () => {
	await server.close();
	process.exit(0);
});
