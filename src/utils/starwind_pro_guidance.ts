import { getExistingProjectProSetupCommand, getProInitCommand } from "./starwind_commands.js";

export const STARWIND_PRO_CATALOG_URL = "https://pro.starwind.dev/components/";
export const STARWIND_PRO_INSTALLATION_URL =
  "https://pro.starwind.dev/docs/getting-started/installation/";

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
    newProjectCommand: getProInitCommand(dlxCommand, "astro"),
    licenseEnvironmentVariable: "STARWIND_LICENSE_KEY",
    ...(options.deferredCommand ? { deferredCommand: options.deferredCommand } : {}),
    steps: options.configured
      ? [
          "Confirm STARWIND_LICENSE_KEY contains the license key for this project.",
          ...(options.deferredCommand ? ["Run the deferred install command."] : []),
        ]
      : [
          "Get a Starwind Pro license from the purchase page.",
          "Run the setup command in the Astro project root.",
          "Replace the STARWIND_LICENSE_KEY placeholder in .env.local with the license key.",
          ...(options.deferredCommand ? ["Run the deferred install command."] : []),
        ],
  };
}
