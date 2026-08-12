import { z } from "zod";

import { detectPackageManager, type PackageManager } from "../utils/package_manager.js";
import { inspectStarwindProject } from "../utils/project_context.js";
import { getDlxCommand } from "../utils/starwind_commands.js";

interface StarwindMigrateArgs {
  cwd?: string;
  packageManager?: PackageManager;
  yes?: boolean;
}

export const starwindMigrateTool = {
  name: "starwind_migrate",
  description:
    "Generates the safe Starwind UI v3 migration command for a legacy Astro project. Interactive migration is the default; non-interactive overwrite behavior must be explicitly requested.",
  inputSchema: {
    cwd: z.string().optional().describe("Legacy Starwind project directory to inspect."),
    packageManager: z.enum(["npm", "pnpm", "yarn"]).optional(),
    yes: z
      .boolean()
      .optional()
      .describe("Add --yes to create a backup and overwrite registered conflicts without prompts."),
  },
  outputSchema: {
    result: z.record(z.unknown()).describe("Structured Starwind migration guidance."),
  },

  async handler(args: StarwindMigrateArgs = {}): Promise<Record<string, unknown>> {
    const cwd = args.cwd ?? process.cwd();
    const project = inspectStarwindProject(cwd);
    const pmInfo = args.packageManager
      ? { name: args.packageManager, source: "user-specified" as const }
      : { ...detectPackageManager({ cwd }), source: "detected" as const };
    const flags = args.yes ? ` --yes --package-manager ${pmInfo.name}` : "";
    const applicable = project.configVersion === 1;
    // Interactive migration lets the CLI auto-detect; non-interactive mode pins the detected manager.
    const applicabilityWarnings = project.configVersionInvalid
      ? ["The Starwind config has an invalid version; verify it before attempting migration."]
      : project.configVersion === null
        ? ["No Starwind config was detected; initialize a new v3 project instead of migrating."]
        : project.configVersion === 2
          ? ["This project already has a v2 Runtime config and does not need the legacy migration."]
          : project.configVersion !== 1
            ? [
                `Starwind config version ${project.configVersion} is not a supported legacy version.`,
              ]
            : [];
    const migrationWarnings = applicable
      ? [
          "Confirm the Git working tree is clean and recoverable before migrating.",
          "Run the project's build, typecheck, and tests before and after migration.",
          "Keep the generated starwind-legacy backup until browser verification passes.",
          ...(args.yes
            ? [
                "--yes creates the component backup and overwrites registered conflicts without prompting.",
              ]
            : []),
        ]
      : [];

    return {
      success: applicable,
      ...(applicable
        ? { command: `${getDlxCommand(pmInfo.name)} starwind@latest migrate${flags}` }
        : {}),
      interactive: applicable && args.yes !== true,
      packageManager: pmInfo.name,
      packageManagerSource: pmInfo.source,
      project,
      applicable,
      warnings: [...migrationWarnings, ...applicabilityWarnings],
      reviewAfterMigration: applicable
        ? [
            "Review migrated, skipped, custom, legacy, and rename-codemod outcomes.",
            "Inspect every config entry that remains source: legacy.",
            "Audit legacy events, props, imports, helpers, selectors, and component customizations.",
            "Verify theme, forms, overlays, events, navigation, and responsive behavior in a browser.",
          ]
        : [],
      documentation: {
        guide: "https://starwind.dev/docs/getting-started/migration/",
        blog: "https://starwind.dev/blog/migrating-to-starwind-ui-v3/",
      },
    };
  },
};
