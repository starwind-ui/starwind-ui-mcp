import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	McpError,
	ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { packageManagerTool } from "./package_manager_tool.js";
import { llmDataFetcherTool } from "./llm_data_fetcher_tool.js";
import { documentationTool } from "./documentation_tool.js";
import { initProjectTool } from "./init_project_tool.js";
import { installComponentTool } from "./install_component_tool.js";
import { updateComponentTool } from "./update_component_tool.js";

/**
 * Collection of available tools
 */
const tools = new Map();

// tools.set("list_tools", {
// 	description: "Lists all available tools",
// 	inputSchema: {
// 		type: "object",
// 		properties: {},
// 		required: [],
// 	},
// 	handler: async () => {
// 		return Array.from(tools.entries()).map(([name, tool]) => ({
// 			name,
// 			description: (tool as any).description,
// 			inputSchema: (tool as any).inputSchema,
// 		}));
// 	},
// });

// Register init project tool
tools.set(initProjectTool.name, initProjectTool);

// Register install component tool
tools.set(installComponentTool.name, installComponentTool);

// Register update component tool
tools.set(updateComponentTool.name, updateComponentTool);

// Register documentation tool
tools.set(documentationTool.name, documentationTool);

// Register LLM data fetcher tool
tools.set(llmDataFetcherTool.name, llmDataFetcherTool);

// Register package manager tool
tools.set(packageManagerTool.name, packageManagerTool);

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
