import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";

import { starwindAddTool } from "./starwind_add_tool.js";
import { starwindDocsTool } from "./starwind_docs_tool.js";
import { starwindInitTool } from "./starwind_init_tool.js";
import { starwindSearchTool } from "./starwind_search_tool.js";

/**
 * Shape shared by every tool definition registered with the MCP server.
 */
export interface ToolDefinition {
  /** Unique tool name exposed to MCP clients. */
  name: string;
  /** Human-readable description shown to clients. */
  description: string;
  /** Zod raw shape describing the tool's input arguments. */
  inputSchema: ZodRawShape;
  /** Executes the tool and returns an arbitrary JSON-serializable result. */
  handler: (args: any) => Promise<unknown>;
}

/**
 * Collection of available tools, in registration order.
 */
const tools: ToolDefinition[] = [
  // Fetches live documentation from starwind.dev
  starwindDocsTool,
  // Generates validated install commands
  starwindAddTool,
  // Searches Starwind components and Pro blocks
  starwindSearchTool,
  // Dedicated project initialization
  starwindInitTool,
];

/**
 * Register all tools on the high-level MCP server using `registerTool`.
 * @param server - The high-level `McpServer` instance.
 */
export function setupTools(server: McpServer): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args) => {
        try {
          const result = await tool.handler(args);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      },
    );
  }
}

export { tools };
