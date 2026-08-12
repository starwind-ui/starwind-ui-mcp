import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";

import { starwindAddTool } from "./starwind_add_tool.js";
import { starwindDocsTool } from "./starwind_docs_tool.js";
import { starwindInitTool } from "./starwind_init_tool.js";
import { starwindMigrateTool } from "./starwind_migrate_tool.js";
import { starwindSearchTool } from "./starwind_search_tool.js";

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: ZodRawShape;
  outputSchema?: ZodRawShape;
  handler: (args: never) => Promise<unknown>;
};

const tools: ToolDefinition[] = [
  starwindInitTool,
  starwindAddTool,
  starwindSearchTool,
  starwindDocsTool,
  starwindMigrateTool,
];

export function registerTools(server: McpServer): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
      },
      async (args) => {
        try {
          const result = await tool.handler(args as never);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: { result },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown tool error";

          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      },
    );
  }
}

export const setupTools = registerTools;

export {
  starwindAddTool,
  starwindDocsTool,
  starwindInitTool,
  starwindMigrateTool,
  starwindSearchTool,
};
