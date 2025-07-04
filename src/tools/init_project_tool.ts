/**
 * Tool for initializing a new project with Starwind UI
 */

/**
 * Interface for init project tool arguments
 */
export interface InitProjectArgs {
  /** Package manager to use (npm, yarn, pnpm) */
  packageManager?: "npm" | "yarn" | "pnpm";
  /** Additional options for initialization */
  options?: string[];
}

/**
 * Initialize project tool definition
 */
export const initProjectTool = {
  name: "init_project",
  description: "Initializes a new project with Starwind UI",
  inputSchema: {
    type: "object",
    properties: {
      packageManager: {
        type: "string",
        description: "Package manager to use (npm, yarn, pnpm)",
        enum: ["npm", "yarn", "pnpm"],
      },
    },
    required: [],
  },
  handler: async (args: InitProjectArgs = {}) => {
    const packageManager = args.packageManager || "npx";

    // Build the init command based on the package manager
    let initCommand: string;

    switch (packageManager) {
      case "npm":
        initCommand = "npx starwind@latest init --defaults";
        break;
      case "yarn":
        initCommand = "yarn dlx starwind@latest init --defaults";
        break;
      case "pnpm":
        initCommand = "pnpm dlx starwind@latest init --defaults";
        break;
      default:
        initCommand = "npx starwind@latest init --defaults";
    }

    return {
      packageManager,
      command: initCommand,
      timestamp: new Date().toISOString(),
      instructions: "Run this command in your project directory to initialize Starwind UI",
      note: "This will create or modify files in your project directory. Make sure to review the changes and have a clean git working tree before running.",
    };
  },
};
