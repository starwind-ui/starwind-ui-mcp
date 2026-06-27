import { z } from "zod";

import { detectPackageManager, type PackageManager } from "../utils/package_manager.js";
import {
  getDlxCommand,
  getExistingProjectProSetupCommand,
  getProInitCommand,
} from "../utils/starwind_commands.js";

/**
 * Arguments for the starwind_init tool
 */
interface StarwindInitArgs {
  cwd?: string;
  packageManager?: "npm" | "pnpm" | "yarn";
  pro?: boolean;
}

/**
 * Starwind Init tool - dedicated tool for initializing Starwind UI projects
 *
 * Defaults to Pro setup since it doesn't break anything and enables Pro blocks.
 */
export const starwindInitTool = {
  name: "starwind_init",
  description:
    "Initializes a new Starwind UI project. Defaults to Pro setup, which enables standard components and Pro blocks for new projects. For an already initialized Starwind UI project that needs Pro support, use starwind setup --yes instead of reinitializing.",
  inputSchema: {
    cwd: z
      .string()
      .optional()
      .describe("Working directory for package manager detection. Defaults to current directory."),
    packageManager: z
      .enum(["npm", "pnpm", "yarn"])
      .optional()
      .describe(
        "Override the auto-detected package manager. Use this if package manager detection fails or you want to force a specific one.",
      ),
    pro: z
      .boolean()
      .optional()
      .describe(
        "Whether to initialize with Starwind Pro support. Defaults to TRUE. Pro setup enables both standard components AND Pro blocks. Only set to false if you specifically want standard-only setup.",
      ),
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
      ? getProInitCommand(dlxCommand)
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
        : "This command initializes Starwind UI standard. You can only use standard components from this new-project setup. To use Pro blocks later, use init --pro for a new project or setup for an already initialized Starwind UI project.",
      nextSteps: isPro
        ? [
            "Run the command above in your project directory",
            "Then use starwind_add to add components: e.g., button, card, dialog",
            "Or use starwind_search to find components and Pro blocks like heroes, footers, etc.",
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
      ...(isPro
        ? {
            proSetup: {
              newProjectCommand: getProInitCommand(dlxCommand),
              existingProjectCommand: getExistingProjectProSetupCommand(dlxCommand, pmInfo.name),
              note: "Use init for a new project. For an already initialized Starwind UI project, run setup once before adding Pro blocks.",
            },
          }
        : {
            proSetup: {
              newProjectCommand: getProInitCommand(dlxCommand),
              existingProjectCommand: getExistingProjectProSetupCommand(dlxCommand, pmInfo.name),
              note: "To use Pro blocks later, use init --pro for a new project or setup for an already initialized Starwind UI project.",
            },
          }),
    };
  },
};
