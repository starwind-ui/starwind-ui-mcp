import { z } from "zod";

import { detectPackageManager, type PackageManager } from "../utils/package_manager.js";
import { inspectStarwindProject } from "../utils/project_context.js";
import {
  getDlxCommand,
  getExistingProjectProSetupCommand,
  getInitCommand,
} from "../utils/starwind_commands.js";
import {
  getStarwindManifest,
  resetStarwindManifestCache,
  type StarwindFramework,
} from "../utils/starwind_manifest.js";
import { getProDiscovery, getProUpgrade } from "../utils/starwind_pro_guidance.js";
import {
  getStarwindProManifest,
  resetStarwindProManifestCache,
} from "../utils/starwind_pro_manifest.js";

export interface StarwindAddArgs {
  components: string[];
  surface?: "styled" | "primitive";
  framework?: StarwindFramework;
  to?: string;
  overwrite?: boolean;
  init?: boolean;
  pro?: boolean;
  cwd?: string;
  packageManager?: PackageManager;
}

const ITEM_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRO_BLOCK_PATTERN = /^@starwind-pro\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9._/-]+$/;

export function resetAddToolState(): void {
  resetStarwindManifestCache();
  resetStarwindProManifestCache();
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isAll(value: string): boolean {
  return value === "all" || value === "--all";
}

function isProBlock(value: string): boolean {
  return PRO_BLOCK_PATTERN.test(value);
}

function isSafeDestination(value: string): boolean {
  const segments = value.split("/");
  return (
    SAFE_PATH_PATTERN.test(value) &&
    !value.startsWith("/") &&
    value !== "." &&
    !segments.includes("..")
  );
}

function suggestionsFor(value: string, available: string[]): string[] {
  return available.filter((candidate) => candidate.includes(value) || value.includes(candidate));
}

function parseProInstallItems(command: string, expectedBlock: string): string[] | null {
  // The published manifest uses this exact canonical prefix; strict parsing keeps remote data fail-closed.
  const tokens = command.trim().split(/\s+/);
  if (tokens[0] !== "npx" || tokens[1] !== "starwind@latest" || tokens[2] !== "add") return null;
  const items = tokens.slice(3);
  if (items[0] !== expectedBlock || items.slice(1).some((item) => !ITEM_PATTERN.test(item))) {
    return null;
  }
  return items;
}

export const starwindAddTool = {
  name: "starwind_add",
  description:
    "Generates validated Starwind UI v3 install commands for styled components, vendored primitives, or Starwind Pro blocks, with optional Astro or React targeting.",
  inputSchema: {
    components: z
      .array(z.string())
      .min(1, "At least one component must be specified")
      .describe("Names to install, or a single 'all'/'--all' item."),
    surface: z.enum(["styled", "primitive"]).optional().describe("Defaults to styled."),
    framework: z.enum(["astro", "react"]).optional().describe("Optional framework override."),
    to: z.string().optional().describe("Primitive destination passed to --to."),
    overwrite: z.boolean().optional().describe("Allow the CLI to overwrite existing files."),
    init: z.boolean().optional().describe("Prepend project initialization for a new setup."),
    pro: z.boolean().optional().describe("Configure paid Pro authorization during optional init."),
    cwd: z.string().optional(),
    packageManager: z.enum(["npm", "pnpm", "yarn"]).optional(),
  },
  outputSchema: {
    result: z.record(z.unknown()).describe("Structured Starwind installation result."),
  },

  async handler(args: StarwindAddArgs): Promise<Record<string, unknown>> {
    if (!args.components?.length) {
      return { success: false, error: "At least one component must be specified" };
    }

    const surface = args.surface ?? "styled";
    const normalized = args.components.map(normalize);
    const installAll = normalized.some(isAll);
    if (installAll && normalized.length > 1) {
      return { success: false, error: "Use 'all' by itself instead of mixing it with named items" };
    }
    const unsafe = normalized.filter(
      (value) => !isAll(value) && !ITEM_PATTERN.test(value) && !PRO_BLOCK_PATTERN.test(value),
    );
    if (unsafe.length) {
      return { success: false, error: "Invalid component name", invalidComponents: unsafe };
    }
    if (args.to && !isSafeDestination(args.to)) {
      return { success: false, error: "Invalid primitive destination path" };
    }
    if (args.to && surface !== "primitive") {
      return { success: false, error: "The --to destination is only valid for primitive installs" };
    }

    const proBlocks = normalized.filter(isProBlock);
    if (surface === "primitive" && proBlocks.length) {
      return { success: false, error: "Starwind Pro blocks are styled installs, not primitives" };
    }

    const cwd = args.cwd ?? process.cwd();
    const project = inspectStarwindProject(cwd);
    const effectiveFramework =
      args.framework ?? project.configuredFramework ?? project.detectedFramework;
    if (effectiveFramework === "react" && (proBlocks.length || args.pro === true)) {
      return {
        success: false,
        error: "Starwind Pro blocks and paid authorization currently target Astro, not React",
        project,
      };
    }

    const pmInfo = args.packageManager
      ? { name: args.packageManager, source: "user-specified" as const }
      : { ...detectPackageManager({ cwd }), source: "detected" as const };
    const dlx = getDlxCommand(pmInfo.name);
    const proMetadataPromise = proBlocks.length
      ? getStarwindProManifest()
          .then((value) => ({ ok: true as const, ...value }))
          .catch(() => ({ ok: false as const }))
      : Promise.resolve({ ok: false as const });
    const [{ manifest, source }, proMetadata] = await Promise.all([
      getStarwindManifest(),
      proMetadataPromise,
    ]);

    const available =
      surface === "styled"
        ? manifest.components
            .filter((item) => item.installable)
            .filter(
              (item) =>
                !effectiveFramework || item.implementationTargets.includes(effectiveFramework),
            )
            .map((item) => item.name)
        : manifest.layeredDocs.primitives
            .filter(
              (item) =>
                !effectiveFramework ||
                item.adapterUsage.some(
                  (usage) => usage.framework.toLowerCase() === effectiveFramework,
                ),
            )
            .map((item) => item.id);
    const requested = normalized.filter((value) => !isAll(value) && !isProBlock(value));
    const valid = requested.filter((value) => available.includes(value));
    const invalid = requested.filter((value) => !available.includes(value));
    const suggestions = Object.fromEntries(
      invalid
        .map((value) => [value, suggestionsFor(value, available)])
        .filter(([, values]) => values.length),
    );

    if (!installAll && valid.length === 0 && proBlocks.length === 0) {
      return {
        success: false,
        error: "No valid items specified",
        invalidComponents: invalid,
        suggestions,
        availableItems: available,
        metadataSource: source,
      };
    }

    if (proBlocks.length && !proMetadata.ok) {
      return {
        success: false,
        error: "Unable to validate Pro blocks because the Pro manifest is unavailable",
        invalidComponents: proBlocks,
      };
    }
    const resolvedProBlocks = proBlocks.map((name) => ({
      name,
      block: proMetadata.ok
        ? proMetadata.manifest.blocks.find(
            (candidate) => candidate.id === name.slice("@starwind-pro/".length),
          )
        : undefined,
    }));
    const unknownProBlocks = resolvedProBlocks.filter(({ block }) => !block);
    if (unknownProBlocks.length) {
      return {
        success: false,
        error: "Unknown Pro block",
        invalidComponents: unknownProBlocks.map(({ name }) => name),
      };
    }
    const proPlans = resolvedProBlocks.map(({ name, block }) => {
      if (!block) throw new Error("Validated Pro block was unexpectedly unavailable");
      const installItems = parseProInstallItems(block.installCommand, name);
      return {
        name,
        plan: block.plan,
        installItems,
        dependencies: installItems?.slice(1) ?? [],
      };
    });
    const malformedProBlocks = proPlans.filter((block) => block.installItems === null);
    if (malformedProBlocks.length) {
      return {
        success: false,
        error: "Invalid Pro manifest install command",
        invalidComponents: malformedProBlocks.map((block) => block.name),
      };
    }
    const paidBlocks = proPlans.filter((block) => block.plan === "pro");
    const expandedProItems = proPlans.flatMap((block) => block.installItems ?? []);
    const names = installAll ? [] : [...new Set([...valid, ...expandedProItems])];
    const namespace = surface === "primitive" ? " primitives" : "";
    const flags = [installAll ? "--all" : names.join(" "), "--yes"];
    if (args.framework) flags.push("--framework", args.framework);
    if (surface === "primitive" && args.to) flags.push("--to", args.to);
    if (args.overwrite) flags.push("--overwrite");
    flags.push("--package-manager", pmInfo.name);
    const addCommand = `${dlx} starwind@latest${namespace} add ${flags.filter(Boolean).join(" ")}`;
    const paidAuthorizationRequested = args.pro === true;
    const needsProGuidance = paidAuthorizationRequested || paidBlocks.length > 0;
    const upgradeRequired = needsProGuidance && !project.proRegistryConfigured;
    const setupCommand = args.init
      ? getInitCommand(dlx, {
          framework: args.framework,
          pro: upgradeRequired || paidAuthorizationRequested,
        })
      : getExistingProjectProSetupCommand(dlx);
    const commands: string[] = [];
    let command: string;
    let deferredCommand: string | undefined;
    if (upgradeRequired) {
      commands.push(setupCommand);
      command = setupCommand;
      deferredCommand = addCommand;
    } else {
      if (args.init) {
        commands.push(
          getInitCommand(dlx, {
            framework: args.framework,
            pro: paidAuthorizationRequested,
          }),
        );
      }
      commands.push(addCommand);
      command = commands.join(" && ");
    }

    return {
      success: true,
      surface,
      framework: effectiveFramework,
      packageManager: pmInfo.name,
      packageManagerSource: pmInfo.source,
      metadataSource: source,
      componentsToInstall: installAll ? ["all"] : names,
      availableItems: available,
      commands,
      command,
      ...(deferredCommand ? { deferredCommand } : {}),
      project,
      warnings: invalid.length
        ? {
            invalidComponents: invalid,
            suggestions,
            message: `Unrecognized or framework-incompatible items were skipped: ${invalid.join(", ")}`,
          }
        : undefined,
      instructions: upgradeRequired
        ? "Complete Pro setup and add the license key before running the deferred install command."
        : "Run the command in an initialized Starwind UI v3 project root.",
      ...(proBlocks.length
        ? {
            proAccess: {
              blocks: proPlans,
              metadataSource: proMetadata.ok ? proMetadata.source : "unavailable",
              paidAuthorizationRequested,
              proRegistryConfigured: project.proRegistryConfigured,
              note: paidBlocks.length
                ? project.proRegistryConfigured
                  ? "Pro registry configuration was detected. Confirm STARWIND_LICENSE_KEY is set before installing paid blocks."
                  : "Paid blocks require a license. Complete the Pro upgrade steps before installing."
                : "Free Pro catalog blocks work after ordinary Starwind initialization.",
            },
          }
        : {}),
      ...(needsProGuidance
        ? {
            proUpgrade: getProUpgrade({
              dlxCommand: dlx,
              reason: paidBlocks.length
                ? `Paid authorization is required for: ${paidBlocks
                    .map((block) => block.name)
                    .join(", ")}.`
                : "Paid Starwind Pro authorization was requested.",
              configured: project.proRegistryConfigured,
              setupCommand,
              deferredCommand,
            }),
          }
        : proBlocks.length
          ? { proDiscovery: getProDiscovery(dlx) }
          : {}),
    };
  },
};
