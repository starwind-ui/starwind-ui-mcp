import type { PackageManager } from "./package_manager.js";
import type { StarwindFramework } from "./starwind_manifest.js";

export function getDlxCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case "pnpm":
      return "pnpm dlx";
    case "yarn":
      return "yarn dlx";
    case "bun":
      return "bunx";
    case "npm":
    default:
      return "npx";
  }
}

/**
 * The framework to pass to `starwind init`. A detected Vue host needs an explicit
 * `--framework vue`: below Vue 3.5.21 the CLI marks the Vue target "configurable", and only an
 * explicit target reaches the CLI's Vue upgrade offer. Other hosts keep CLI auto-detection.
 */
export function getInitFramework(
  explicit: StarwindFramework | undefined,
  project: {
    configuredFramework: StarwindFramework | null;
    detectedFramework: StarwindFramework | null;
  },
): StarwindFramework | undefined {
  const projectFramework = project.configuredFramework ?? project.detectedFramework;
  return explicit ?? (projectFramework === "vue" ? "vue" : undefined);
}

export function getInitCommand(
  dlxCommand: string,
  options: { framework?: StarwindFramework; pro?: boolean } = {},
): string {
  const flags = ["--defaults"];
  if (options.framework) flags.push("--framework", options.framework);
  if (options.pro) flags.push("--pro");
  return `${dlxCommand} starwind@latest init ${flags.join(" ")}`;
}

export function getProInitCommand(dlxCommand: string, framework?: StarwindFramework): string {
  return getInitCommand(dlxCommand, { framework, pro: true });
}

export function getExistingProjectProSetupCommand(dlxCommand: string): string {
  return `${dlxCommand} starwind@latest setup --yes`;
}
