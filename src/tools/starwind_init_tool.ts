import { detectPackageManager, type PackageManager } from "../utils/package_manager.js";

/**
 * Arguments for the starwind_init tool
 */
interface StarwindInitArgs {
  cwd?: string;
  packageManager?: "npm" | "pnpm" | "yarn";
  pro?: boolean;
}

/**
 * Get the dlx command for a package manager
 */
function getDlxCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case "npm":
      return "npx";
    case "yarn":
      return "yarn dlx";
    case "pnpm":
      return "pnpm dlx";
    default:
      return "npx";
  }
}

/**
 * Starwind Init tool - dedicated tool for initializing Starwind UI projects
 *
 * Defaults to Pro setup since it doesn't break anything and enables Pro blocks.
 */
export const starwindInitTool = {
  name: "starwind_init",
  description:
    "Initializes a Starwind UI project. ALWAYS use this tool FIRST before adding any Starwind components or blocks. Defaults to Pro setup (recommended) which enables both standard components AND Pro blocks. Set pro=false only if you specifically want standard-only setup.",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory for package manager detection. Defaults to current directory.",
      },
      packageManager: {
        type: "string",
        enum: ["npm", "pnpm", "yarn"],
        description:
          "Override the auto-detected package manager. Use this if package manager detection fails or you want to force a specific one.",
      },
      pro: {
        type: "boolean",
        description:
          "Whether to initialize with Starwind Pro support. Defaults to TRUE. Pro setup enables both standard components AND Pro blocks. Only set to false if you specifically want standard-only setup.",
        default: true,
      },
    },
    required: [],
  },

  /**
   * Handler for the starwind_init tool
   */
  async handler(args: StarwindInitArgs): Promise<Record<string, unknown>> {
    // Default to Pro setup
    const isPro = args.pro !== false;

    // Detect or use provided package manager
    const pmInfo = args.packageManager
      ? { name: args.packageManager as PackageManager, source: "user-specified" as const }
      : detectPackageManager({ cwd: args.cwd });

    const dlxCommand = getDlxCommand(pmInfo.name);

    // Build init command
    const initCommand = isPro
      ? `${dlxCommand} starwind@latest init --defaults --pro`
      : `${dlxCommand} starwind@latest init --defaults`;

    return {
      success: true,
      command: initCommand,
      packageManager: pmInfo.name,
      packageManagerSource: "source" in pmInfo ? pmInfo.source : "detected",
      proEnabled: isPro,
      setupType: isPro ? "Starwind Pro" : "Starwind Standard",
      description: isPro
        ? "This command initializes Starwind UI with Pro support. You can use both standard components (button, card, etc.) AND Pro blocks (@starwind-pro/hero-01, etc.)."
        : "This command initializes Starwind UI standard. You can only use standard components. To use Pro blocks, re-run init with pro=true.",
      nextSteps: isPro
        ? [
            "Run the command above in your project directory",
            "Then use starwind_add to add components: e.g., button, card, dialog",
            "Or use search_starwind_pro_blocks to find Pro blocks like heroes, footers, etc.",
          ]
        : [
            "Run the command above in your project directory",
            "Then use starwind_add to add components: e.g., button, card, dialog",
            "Note: Pro blocks will NOT work with this setup",
          ],
      requirements: {
        framework: "Astro",
        styling: "Tailwind CSS v4",
        note: "Make sure your project has Astro and Tailwind CSS v4 configured before running init.",
      },
      cliFlags: {
        "--defaults": "Accepts all default configuration options (required for AI execution)",
        "--pro": "Enables Starwind Pro support for premium blocks",
        "--yes": "Skips confirmation prompts (used by add command, not init)",
      },
    };
  },
};
