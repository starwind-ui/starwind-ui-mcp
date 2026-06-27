/**
 * Starwind Add Tool
 * Generates validated install commands for Starwind UI components
 */

import { z } from "zod";

import { detectPackageManager, type PackageManager } from "../utils/package_manager.js";
import {
  getStandardComponentMetadata,
  resetStandardComponentMetadataCache,
} from "../utils/starwind_component_metadata.js";

/**
 * Interface for starwind add tool arguments
 */
export interface StarwindAddArgs {
  /** Component(s) to install */
  components: string[];
  /** Whether to also include the init command (for new projects) */
  init?: boolean;
  /** Whether this is a Starwind Pro project (adds --pro to init command) */
  pro?: boolean;
  /** Working directory for package manager detection */
  cwd?: string;
  /** Override package manager detection (useful if auto-detection fails) */
  packageManager?: "npm" | "pnpm" | "yarn";
}

/**
 * Reset component cache state (for testing purposes)
 */
export function resetAddToolState(): void {
  resetStandardComponentMetadataCache();
}

/**
 * Get the dlx command for a package manager
 */
function getDlxCommand(pm: PackageManager): string {
  switch (pm) {
    case "pnpm":
      return "pnpm dlx";
    case "yarn":
      return "yarn dlx";
    case "npm":
    default:
      return "npx";
  }
}

/**
 * Validate components against available components list
 */
function validateComponents(
  components: string[],
  availableComponents: string[],
): {
  valid: string[];
  invalid: string[];
  suggestions: Record<string, string[]>;
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const suggestions: Record<string, string[]> = {};

  for (const component of components) {
    const normalized = component.toLowerCase().trim();

    if (availableComponents.includes(normalized)) {
      valid.push(normalized);
    } else {
      invalid.push(component);
      // Find similar components for suggestions
      const similar = availableComponents.filter(
        (known) => known.includes(normalized) || normalized.includes(known),
      );
      if (similar.length > 0) {
        suggestions[component] = similar;
      }
    }
  }

  return { valid, invalid, suggestions };
}

/**
 * Starwind Add tool definition
 */
export const starwindAddTool = {
  name: "starwind_add",
  description:
    "Generates the installation command for Starwind UI components. Validates component names and returns the correct CLI command based on the detected package manager. Use this after consulting starwind_docs to know which components to install. For Starwind Pro blocks (prefixed with @starwind-pro/), set pro=true or the tool will auto-detect it.",
  inputSchema: {
    components: z
      .array(z.string())
      .describe(
        "Array of component names to install (e.g., ['button', 'card', 'dialog']). Use '--all' as a single item to install all components.",
      ),
    init: z
      .boolean()
      .optional()
      .describe(
        "Whether to include the init command for new projects. Set to true if Starwind UI has not been initialized in the project yet.",
      ),
    pro: z
      .boolean()
      .optional()
      .describe(
        "Set to true for Starwind Pro projects. This adds --pro to the init command. Required when using @starwind-pro/ blocks. Auto-detected if components contain @starwind-pro/ prefix.",
      ),
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
  },
  handler: async (args: StarwindAddArgs) => {
    const { components, init = false, cwd, packageManager } = args;

    // Auto-detect Pro mode if any component has @starwind-pro/ prefix
    const hasProComponents = components.some((c) => c.toLowerCase().includes("@starwind-pro/"));
    const isPro = args.pro === true || hasProComponents;

    if (!components || components.length === 0) {
      throw new Error("At least one component must be specified");
    }

    // Fetch available components from llms.txt (with caching and fallback)
    const { components: componentMetadata, source: componentSource } =
      await getStandardComponentMetadata();
    const availableComponents = componentMetadata.map((component) => component.slug);

    // Detect package manager (or use override)
    const pmInfo = packageManager
      ? { name: packageManager as PackageManager }
      : detectPackageManager({ cwd });
    const dlxCommand = getDlxCommand(pmInfo.name);

    // Check for --all flag
    const installAll = components.some(
      (c) => c.toLowerCase() === "--all" || c.toLowerCase() === "all",
    );

    let addCommand: string;
    let validation: ReturnType<typeof validateComponents> | null = null;

    // Separate Pro blocks from standard components
    const proBlocks = components.filter((c) => c.toLowerCase().includes("@starwind-pro/"));
    const standardComponents = components.filter(
      (c) => !c.toLowerCase().includes("@starwind-pro/"),
    );

    if (installAll) {
      addCommand = `${dlxCommand} starwind@latest add --all --yes`;
    } else if (proBlocks.length > 0 && standardComponents.length === 0) {
      // Only Pro blocks - no validation needed, use as-is
      addCommand = `${dlxCommand} starwind@latest add ${proBlocks.join(" ")} --yes`;
    } else {
      // Validate standard components against fetched list
      validation = validateComponents(
        standardComponents.length > 0 ? standardComponents : components,
        availableComponents,
      );

      if (validation.valid.length === 0 && proBlocks.length === 0) {
        return {
          success: false,
          error: "No valid components specified",
          invalidComponents: validation.invalid,
          suggestions: validation.suggestions,
          availableComponents,
          componentSource,
          hint: "Use starwind_docs tool to see available components and their documentation.",
        };
      }

      // Combine valid standard components with Pro blocks
      const allComponents = [...validation.valid, ...proBlocks];
      addCommand = `${dlxCommand} starwind@latest add ${allComponents.join(" ")} --yes`;
    }

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      packageManager: pmInfo.name,
      commands: [] as string[],
      componentSource,
    };

    // Add init command if requested
    if (init) {
      const initCommand = isPro
        ? `${dlxCommand} starwind@latest init --defaults --pro`
        : `${dlxCommand} starwind@latest init --defaults`;
      (response.commands as string[]).push(initCommand);
      response.initNote = isPro
        ? "The init command uses --defaults --pro to set up Starwind Pro. This is REQUIRED for @starwind-pro/ blocks to work."
        : "The init command uses --defaults to accept all default options. For Starwind Pro blocks, use init with pro=true.";
    }

    // Add Pro mode info to response
    response.proMode = isPro;
    if (hasProComponents && !args.pro) {
      response.proAutoDetected = true;
    }

    (response.commands as string[]).push(addCommand);

    // Single command for easy copy-paste
    response.command = (response.commands as string[]).join(" && ");

    // Add validation info if we validated components
    if (validation) {
      // Include both validated standard components and Pro blocks
      response.componentsToInstall = [...validation.valid, ...proBlocks];

      if (validation.invalid.length > 0) {
        response.warnings = {
          invalidComponents: validation.invalid,
          suggestions: validation.suggestions,
          message: `Some components were not recognized and will be skipped: ${validation.invalid.join(", ")}`,
        };
      }
    } else if (proBlocks.length > 0) {
      response.componentsToInstall = proBlocks;
    } else {
      response.componentsToInstall = ["all"];
    }

    response.availableComponents = availableComponents;
    response.instructions =
      "Run the command in your project directory. Make sure you have an Astro project with Tailwind CSS v4 configured.";
    response.cliFlags = {
      note: "Commands include --yes to skip confirmation prompts (required for AI execution).",
      availableFlags: {
        add: ["--yes (skip prompts)", "--all (install all components)"],
        init: ["--defaults (accept all defaults)", "--pro (required for Starwind Pro blocks)"],
      },
    };

    // Add important note about Pro initialization
    if (isPro) {
      response.proNote =
        "IMPORTANT: Starwind Pro blocks require initialization with --pro flag. Make sure the project was initialized with 'starwind@latest init --defaults --pro' before adding Pro blocks.";
    }

    return response;
  },
};
