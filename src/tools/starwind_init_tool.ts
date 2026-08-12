import { z } from "zod";

import { detectPackageManager, type PackageManager } from "../utils/package_manager.js";
import { inspectStarwindProject } from "../utils/project_context.js";
import { getDlxCommand, getInitCommand } from "../utils/starwind_commands.js";
import type { StarwindFramework } from "../utils/starwind_manifest.js";
import { getProDiscovery, getProUpgrade } from "../utils/starwind_pro_guidance.js";

interface StarwindInitArgs {
  cwd?: string;
  packageManager?: PackageManager;
  framework?: StarwindFramework;
  pro?: boolean;
}

function nodeMeetsV3Requirement(version: string): boolean {
  const [major, minor] = version.split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}

export const starwindInitTool = {
  name: "starwind_init",
  description:
    "Generates a Starwind UI v3 initialization command for an existing Astro or React project. The CLI auto-detects the framework unless an override is provided. Paid Pro authorization is opt-in and currently targets Astro.",
  inputSchema: {
    cwd: z
      .string()
      .optional()
      .describe("Project directory used for package manager and framework detection."),
    packageManager: z.enum(["npm", "pnpm", "yarn"]).optional(),
    framework: z.enum(["astro", "react"]).optional().describe("Optional CLI framework override."),
    pro: z
      .boolean()
      .optional()
      .describe("Configure paid Starwind Pro authorization. Defaults to false."),
  },
  outputSchema: {
    result: z.record(z.unknown()).describe("Structured Starwind initialization result."),
  },

  async handler(args: StarwindInitArgs = {}): Promise<Record<string, unknown>> {
    const cwd = args.cwd ?? process.cwd();
    const project = inspectStarwindProject(cwd);
    const pmInfo = args.packageManager
      ? { name: args.packageManager, source: "user-specified" as const }
      : { ...detectPackageManager({ cwd }), source: "detected" as const };
    const dlxCommand = getDlxCommand(pmInfo.name);
    const isPro = args.pro === true;
    const effectiveFramework =
      args.framework ?? project.configuredFramework ?? project.detectedFramework;
    if (isPro && effectiveFramework === "react") {
      return {
        success: false,
        error:
          "Paid Starwind Pro blocks currently target Astro; initialize React without pro: true.",
        framework: effectiveFramework,
        project,
      };
    }

    const command = getInitCommand(dlxCommand, { framework: args.framework, pro: isPro });
    const warnings: string[] = [];
    if (!nodeMeetsV3Requirement(project.nodeVersion)) {
      warnings.push(
        `Starwind UI v3 requires Node.js >=22.12.0. The MCP server runs on ${project.nodeVersion}; confirm the Node.js version in the project shell.`,
      );
    }
    if (!project.packageJsonFound)
      warnings.push("Run this from an existing Astro or React project root.");
    if (project.configVersion === 1) {
      warnings.push("A legacy Starwind config was detected. Use starwind_migrate instead of init.");
    }

    const hasConfiguredFramework = !args.framework && project.configuredFramework;
    return {
      success: true,
      command,
      packageManager: pmInfo.name,
      packageManagerSource: pmInfo.source,
      framework: effectiveFramework,
      frameworkSource: args.framework
        ? "user-specified"
        : hasConfiguredFramework
          ? "starwind-config"
          : project.detectedFramework
            ? "detected"
            : "cli-auto-detect",
      proEnabled: isPro,
      setupType: isPro ? "Starwind UI with paid Pro authorization" : "Starwind UI",
      project,
      requirements: {
        node: ">=22.12.0",
        framework: "Existing Astro >=5 or React >=18 project",
        styling: "Tailwind CSS v4 (configured by Starwind init)",
      },
      warnings,
      nextSteps: [
        "Run the command in the project root.",
        "Use starwind_search to discover styled components, primitives, and Pro blocks.",
        "Use starwind_add to generate the matching install command.",
      ],
      cliFlags: {
        "--defaults": "Accept default configuration values after project detection.",
        "--framework": "Override framework detection with astro or react.",
        "--pro": "Configure paid Starwind Pro authorization for Astro blocks.",
      },
      ...(effectiveFramework !== "react"
        ? isPro
          ? {
              proUpgrade: getProUpgrade({
                dlxCommand,
                reason: "Paid Starwind Pro authorization was requested for this Astro project.",
                configured: project.proRegistryConfigured,
                setupCommand: command,
              }),
            }
          : { proDiscovery: getProDiscovery(dlxCommand) }
        : {}),
    };
  },
};
