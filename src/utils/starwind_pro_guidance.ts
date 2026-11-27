import { getExistingProjectProSetupCommand, getProInitCommand } from "./starwind_commands.js";
import type { StarwindFramework } from "./starwind_manifest.js";

export const STARWIND_PRO_CATALOG_URL = "https://pro.starwind.dev/components/";
export const STARWIND_PRO_INSTALLATION_URL =
  "https://pro.starwind.dev/docs/getting-started/installation/";

export const STARWIND_PRO_ASTRO_COMPONENTS_WARNING =
  "Starwind Pro blocks are Astro components. Pro setup and block installs work in every framework. Use an Astro host for the block, or port the block to your framework.";

/** Returns the Astro-components warning for a known non-Astro target. Pro is never rejected. */
export function getProFrameworkWarning(
  framework: StarwindFramework | null | undefined,
): string | undefined {
  return framework && framework !== "astro" ? STARWIND_PRO_ASTRO_COMPONENTS_WARNING : undefined;
}

export function getProDiscovery(dlxCommand = "npx") {
  return {
    catalogUrl: STARWIND_PRO_CATALOG_URL,
    installationGuideUrl: STARWIND_PRO_INSTALLATION_URL,
    setupCommand: getExistingProjectProSetupCommand(dlxCommand),
    note: "Explore free and paid production-ready Astro blocks. Free blocks need no license; paid blocks require Starwind Pro setup.",
  };
}

export function getProUpgrade(options: {
  dlxCommand?: string;
  reason: string;
  configured: boolean;
  setupCommand?: string;
  deferredCommand?: string;
  /** The selected or detected framework. The new-project command omits --framework when unknown. */
  framework?: StarwindFramework | null;
}) {
  const dlxCommand = options.dlxCommand ?? "npx";
  const setupCommand = options.setupCommand ?? getExistingProjectProSetupCommand(dlxCommand);

  return {
    required: !options.configured,
    status: options.configured ? "configured" : "setup-required",
    reason: options.reason,
    catalogUrl: STARWIND_PRO_CATALOG_URL,
    purchaseUrl: "https://pro.starwind.dev/",
    installationGuideUrl: STARWIND_PRO_INSTALLATION_URL,
    setupCommand,
    newProjectCommand: getProInitCommand(dlxCommand, options.framework ?? undefined),
    licenseEnvironmentVariable: "STARWIND_LICENSE_KEY",
    ...(options.deferredCommand ? { deferredCommand: options.deferredCommand } : {}),
    steps: options.configured
      ? [
          "Confirm STARWIND_LICENSE_KEY contains the license key for this project.",
          ...(options.deferredCommand ? ["Run the deferred install command."] : []),
        ]
      : [
          "Get a Starwind Pro license from the purchase page.",
          "Run the setup command in the project root.",
          "Replace the STARWIND_LICENSE_KEY placeholder in .env.local with the license key.",
          ...(options.deferredCommand ? ["Run the deferred install command."] : []),
        ],
  };
}
