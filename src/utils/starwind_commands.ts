import type { PackageManager } from "./package_manager.js";
import type { StarwindFramework } from "./starwind_manifest.js";

export function getDlxCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case "pnpm":
      return "pnpm dlx";
    case "yarn":
      return "yarn dlx";
    case "npm":
    default:
      return "npx";
  }
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
