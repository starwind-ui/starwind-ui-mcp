/**
 * Tool for generating component installation commands for Starwind UI
 */

/**
 * Interface for component installation tool arguments
 */
export interface InstallComponentArgs {
	/** Package manager to use (npm, yarn, pnpm) */
	packageManager?: "npm" | "yarn" | "pnpm";
	/** Component name to install */
	component: string;
	/** Additional components to install */
	additionalComponents?: string[];
	/** Additional options for installation */
	options?: string[];
}

/**
 * Install component tool definition
 */
export const installComponentTool = {
	name: "install_component",
	description: "Generates installation commands for Starwind UI components",
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
				description: "Component name to install",
			},
			additionalComponents: {
				type: "array",
				description: "Additional components to install",
				items: {
					type: "string",
				},
			},
			options: {
				type: "array",
				description:
					"Additional options for installation (e.g., '--all' to install all components)",
				items: {
					type: "string",
				},
			},
		},
		required: ["component"],
	},
	handler: async (args: InstallComponentArgs) => {
		const packageManager = args.packageManager || "npx";
		const component = args.component;
		const additionalComponents = args.additionalComponents || [];

		// Combine all components
		const components = [component, ...additionalComponents];

		// Build the installation command based on the package manager
		let baseCommand: string;

		switch (packageManager) {
			case "npm":
				baseCommand = "npx starwind@latest add";
				break;
			case "yarn":
				baseCommand = "yarn dlx starwind@latest add";
				break;
			case "pnpm":
				baseCommand = "pnpm dlx starwind@latest add";
				break;
			default:
				baseCommand = "npx starwind@latest add";
		}

		// Common component options
		const commonOptions = [
			"--all", // Install all components
		];

		// Example components
		const popularComponents = [
			"alert",
			"button",
			"badge",
			"dialog",
			"input",
			"label",
			"switch",
			"tabs",
			"textarea",
			"tooltip",
		];

		// Filtered list of requested components that are included in the popular list
		const requestedPopularComponents = components.filter((c) => popularComponents.includes(c));

		return {
			packageManager,
			baseCommand,
			components,
			// Example with requested component(s)
			example: `${baseCommand} ${components.join(" ")}`,
			availableOptions: commonOptions,
			popularComponents,
			recommendations: {
				single: `${baseCommand} ${component}`,
				multiple: components.length > 1 ? `${baseCommand} ${components.join(" ")}` : null,
				all: `${baseCommand} --all`,
			},
			instructions:
				"Run one of these commands in your project directory to install Starwind UI components. You can combine multiple components in a single command.",
			note: "Make sure you have initialized Starwind UI first with the init command.",
		};
	},
};
