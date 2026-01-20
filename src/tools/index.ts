import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { searchProBlocksTool } from "./search_pro_blocks_tool.js";
import { starwindAddTool } from "./starwind_add_tool.js";
import { starwindDocsTool } from "./starwind_docs_tool.js";

/**
 * Collection of available tools
 */
const tools = new Map();

// Register starwind_docs tool - fetches live documentation from starwind.dev
tools.set(starwindDocsTool.name, starwindDocsTool);

// Register starwind_add tool - generates validated install commands
tools.set(starwindAddTool.name, starwindAddTool);

// Register search_starwind_pro_blocks tool - searches Starwind Pro blocks
tools.set(searchProBlocksTool.name, searchProBlocksTool);

/**
 * Set up the tools for the MCP server
 * @param server - The MCP server instance
 */
export function setupTools(server: Server): void {
  // Register tool capabilities with the server
  // Note: We can't modify server.capabilities directly
  // The capabilities are set during server initialization

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Array.from(tools.entries()).map(([name, tool]) => ({
      name,
      description: (tool as any).description,
      inputSchema: (tool as any).inputSchema,
    })),
  }));

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.get(request.params.name);
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Tool '${request.params.name}' not found`);
    }

    try {
      const result = await (tool as any).handler(request.params.arguments);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  });
}

export { tools };
