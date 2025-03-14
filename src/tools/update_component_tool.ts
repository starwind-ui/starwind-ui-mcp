/**
 * Tool for generating component update commands for Starwind UI
 */

/**
 * Interface for component update tool arguments
 */
export interface UpdateComponentArgs {
	/** Package manager to use (npm, yarn, pnpm) */
	packageManager?: "npm" | "yarn" | "pnpm";
	/** Component name to update */
	component: string;
	/** Additional components to update */
	additionalComponents?: string[];
	/** Additional options for updating */
	options?: string[];
}

/**
 * Update component tool definition
 */
export const updateComponentTool = {
	name: "update_component",
	description: "Generates update commands for Starwind UI components",
	inputSchema: {
		type: "object",
		properties: {
			packageManager: {
				type: "string",
				description: "Package manager to use (npm, yarn, pnpm)",
				enum: ["npm", "yarn", "pnpm"],
			},
			component: {
				type: "string",
				description: "Component name to update",
			},
			additionalComponents: {
				type: "array",
				description: "Additional components to update",
				items: {
					type: "string",
				},
			},
			options: {
				type: "array",
				description: "Additional options for updating (e.g., '--all' to update all components)",
				items: {
					type: "string",
				},
			},
		},
		required: ["component"],
	},
	handler: async (args: UpdateComponentArgs) => {
		const packageManager = args.packageManager || "npx";
		const component = args.component;
		const additionalComponents = args.additionalComponents || [];

		// Combine all components
		const components = [component, ...additionalComponents];

		// Build the update command based on the package manager
		let baseCommand: string;

		switch (packageManager) {
			case "npm":
				baseCommand = "npx starwind@latest update";
				break;
			case "yarn":
				baseCommand = "yarn dlx starwind@latest update";
				break;
			case "pnpm":
				baseCommand = "pnpm dlx starwind@latest update";
				break;
			default:
				baseCommand = "npx starwind@latest update";
		}

		// Common update options
		const commonOptions = [
			"--all", // Update all components
		];

		// Example components
		const popularComponents = [
			"button",
			"card",
			"dialog",
			"dropdown",
			"form",
			"input",
			"navbar",
			"sidebar",
			"table",
		];

		return {
			packageManager,
			baseCommand,
			components,
			example: `${baseCommand} ${components.join(" ")}`,
			availableOptions: commonOptions,
			popularComponents,
			recommendations: {
				single: `${baseCommand} ${component}`,
				multiple: components.length > 1 ? `${baseCommand} ${components.join(" ")}` : null,
				all: `${baseCommand} --all`,
				checkForUpdates: `${baseCommand} --dry-run`,
			},
			instructions:
				"Run one of these commands in your project directory to update Starwind UI components. You can combine multiple components in a single command.",
			note: "The update command will check for and apply updates to the specified components. Use --dry-run to preview updates before applying them.",
		};
	},
};
