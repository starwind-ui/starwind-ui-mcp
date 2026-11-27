import { z } from "zod";

import { detectPackageManager, type PackageManager } from "../utils/package_manager.js";
import { inspectStarwindProject } from "../utils/project_context.js";
import { getDlxCommand, getInitCommand, getInitFramework } from "../utils/starwind_commands.js";
import { STARWIND_FRAMEWORKS, type StarwindFramework } from "../utils/starwind_manifest.js";
import {
  getProDiscovery,
  getProFrameworkWarning,
  getProUpgrade,
} from "../utils/starwind_pro_guidance.js";

interface StarwindInitArgs {
  cwd?: string;
  packageManager?: PackageManager;
  framework?: StarwindFramework;
  pro?: boolean;
}

const FRAMEWORK_REQUIREMENTS: Record<StarwindFramework, string> = {
  astro: "Existing Astro >=5 project",
  react: "Existing React >=18 project with React DOM >=18",
  vue: "Existing Vue >=3.5.21 project. Init offers the Vue upgrade when the project uses an older Vue 3 version.",
  svelte: "Existing Svelte >=5.29.0 <6 project",
};
const ANY_FRAMEWORK_REQUIREMENT =
  "Existing Astro >=5, React >=18, Vue >=3.5.21, or Svelte >=5.29.0 <6 project";

function nodeMeetsV3Requirement(version: string): boolean {
  const [major, minor] = version.split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}

export const starwindInitTool = {
  name: "starwind_init",
  description:
    "Generates a Starwind UI v3 initialization command for an existing Astro, React, Vue, or Svelte project. The CLI auto-detects the framework unless an override is provided. Paid Pro authorization is opt-in and works in every framework. Pro blocks are Astro components.",
  inputSchema: {
    cwd: z
      .string()
      .optional()
      .describe("Project directory used for package manager and framework detection."),
    packageManager: z.enum(["npm", "pnpm", "yarn", "bun"]).optional(),
    framework: z
      .enum(STARWIND_FRAMEWORKS)
      .optional()
      .describe("Optional CLI framework override: astro, react, vue, or svelte."),
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
    const project = inspectStarwindProject(cwd, { packageDocs: args.cwd !== undefined });
    const pmInfo = args.packageManager
      ? { name: args.packageManager, source: "user-specified" as const }
      : { ...detectPackageManager({ cwd }), source: "detected" as const };
    const dlxCommand = getDlxCommand(pmInfo.name);
    const isPro = args.pro === true;
    const effectiveFramework =
      args.framework ?? project.configuredFramework ?? project.detectedFramework;

    const command = getInitCommand(dlxCommand, {
      framework: getInitFramework(args.framework, project),
      pro: isPro,
    });
    const warnings: string[] = [];
    if (!nodeMeetsV3Requirement(project.nodeVersion)) {
      warnings.push(
        `Starwind UI v3 requires Node.js >=22.12.0. The MCP server runs on ${project.nodeVersion}; confirm the Node.js version in the project shell.`,
      );
    }
    if (!project.packageJsonFound)
      warnings.push("Run this from an existing Astro, React, Vue, or Svelte project root.");
    if (project.configVersion === 1) {
      warnings.push("A legacy Starwind config was detected. Use starwind_migrate instead of init.");
    }

    // Pro discovery or upgrade guidance is always part of the result, so the field always applies.
    const proFrameworkWarning = getProFrameworkWarning(effectiveFramework);
    if (proFrameworkWarning && isPro) warnings.push(proFrameworkWarning);

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
        framework: effectiveFramework
          ? FRAMEWORK_REQUIREMENTS[effectiveFramework]
          : ANY_FRAMEWORK_REQUIREMENT,
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
        "--framework": "Override framework detection with astro, react, vue, or svelte.",
        "--pro": "Configure paid Starwind Pro authorization. Pro blocks are Astro components.",
      },
      ...(isPro
        ? {
            proUpgrade: getProUpgrade({
              dlxCommand,
              reason: "Paid Starwind Pro authorization was requested for this project.",
              configured: project.proRegistryConfigured,
              setupCommand: command,
              framework: effectiveFramework,
            }),
          }
        : { proDiscovery: getProDiscovery(dlxCommand) }),
      ...(proFrameworkWarning ? { proFrameworkWarning } : {}),
    };
  },
};
