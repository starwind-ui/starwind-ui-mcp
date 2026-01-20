/**
 * Starwind Add Tool
 * Generates validated install commands for Starwind UI components
 */

import { detectPackageManager, type PackageManager } from "../utils/package_manager.js";

/**
 * Interface for starwind add tool arguments
 */
export interface StarwindAddArgs {
  /** Component(s) to install */
  components: string[];
  /** Whether to also include the init command (for new projects) */
  init?: boolean;
  /** Working directory for package manager detection */
  cwd?: string;
  /** Override package manager detection (useful if auto-detection fails) */
  packageManager?: "npm" | "pnpm" | "yarn";
}

/**
 * Fallback component list - ONLY used if fetching/parsing llms.txt fails
 * This should match the components in https://starwind.dev/llms.txt
 */
const FALLBACK_COMPONENTS = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "button-group",
  "card",
  "carousel",
  "checkbox",
  "collapsible",
  "combobox",
  "dialog",
  "dropdown",
  "dropzone",
  "image",
  "input",
  "input-otp",
  "item",
  "label",
  "pagination",
  "progress",
  "prose",
  "radio-group",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "spinner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "theme-toggle",
  "toast",
  "toggle",
  "tooltip",
  "video",
];

/**
 * Cache for fetched components
 */
interface ComponentCache {
  components: string[];
  timestamp: number;
  expiresAt: number;
}

let componentCache: ComponentCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Reset component cache state (for testing purposes)
 */
export function resetAddToolState(): void {
  componentCache = null;
}

/**
 * Parse component slugs from llms.txt content
 * Extracts from markdown links like: - [Component Name](https://starwind.dev/docs/components/component-slug)
 */
function parseComponentsFromLlmsTxt(content: string): string[] {
  const components: string[] = [];
  const regex = /\[.+?\]\(https:\/\/starwind\.dev\/docs\/components\/([a-z0-9-]+)\)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const slug = match[1];
    if (slug && !components.includes(slug)) {
      components.push(slug);
    }
  }

  return components;
}

/**
 * Fetch available components from llms.txt
 * Returns cached data if available and not expired
 * Falls back to FALLBACK_COMPONENTS on error
 */
async function getAvailableComponents(): Promise<{ components: string[]; source: string }> {
  // Check cache first
  if (componentCache && Date.now() < componentCache.expiresAt) {
    return { components: componentCache.components, source: "cache" };
  }

  try {
    const response = await fetch("https://starwind.dev/llms.txt");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    const parsed = parseComponentsFromLlmsTxt(content);

    if (parsed.length === 0) {
      throw new Error("No components parsed from llms.txt");
    }

    // Update cache
    componentCache = {
      components: parsed,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
    };

    return { components: parsed, source: "network" };
  } catch (error) {
    // Fall back to hardcoded list
    return { components: FALLBACK_COMPONENTS, source: "fallback" };
  }
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
    "Generates the installation command for Starwind UI components. Validates component names and returns the correct CLI command based on the detected package manager. Use this after consulting starwind_docs to know which components to install.",
  inputSchema: {
    type: "object",
    properties: {
      components: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of component names to install (e.g., ['button', 'card', 'dialog']). Use '--all' as a single item to install all components.",
      },
      init: {
        type: "boolean",
        description:
          "Whether to include the init command for new projects. Set to true if Starwind UI has not been initialized in the project yet.",
      },
      cwd: {
        type: "string",
        description:
          "Working directory for package manager detection. Defaults to current directory.",
      },
      packageManager: {
        type: "string",
        enum: ["npm", "pnpm", "yarn"],
        description:
          "Override the auto-detected package manager. Use this if package manager detection fails or you want to force a specific one.",
      },
    },
    required: ["components"],
  },
  handler: async (args: StarwindAddArgs) => {
    const { components, init = false, cwd, packageManager } = args;

    if (!components || components.length === 0) {
      throw new Error("At least one component must be specified");
    }

    // Fetch available components from llms.txt (with caching and fallback)
    const { components: availableComponents, source: componentSource } =
      await getAvailableComponents();

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

    if (installAll) {
      addCommand = `${dlxCommand} starwind@latest add --all --yes`;
    } else {
      // Validate components against fetched list
      validation = validateComponents(components, availableComponents);

      if (validation.valid.length === 0) {
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

      addCommand = `${dlxCommand} starwind@latest add ${validation.valid.join(" ")} --yes`;
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
      const initCommand = `${dlxCommand} starwind@latest init --defaults`;
      (response.commands as string[]).push(initCommand);
      response.initNote =
        "The init command uses --defaults to accept all default options. If you need custom configuration, run without --defaults and respond to the prompts manually.";
    }

    (response.commands as string[]).push(addCommand);

    // Single command for easy copy-paste
    response.command = (response.commands as string[]).join(" && ");

    // Add validation info if we validated components
    if (validation) {
      response.componentsToInstall = validation.valid;

      if (validation.invalid.length > 0) {
        response.warnings = {
          invalidComponents: validation.invalid,
          suggestions: validation.suggestions,
          message: `Some components were not recognized and will be skipped: ${validation.invalid.join(", ")}`,
        };
      }
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
        init: ["--defaults (accept all defaults)"],
      },
    };

    return response;
  },
};
