import type { PackageManager } from "./package_manager.js";

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

export function getProInitCommand(dlxCommand: string): string {
  return `${dlxCommand} starwind@latest init --defaults --pro`;
}

export function getExistingProjectProSetupCommand(
  dlxCommand: string,
  packageManager?: PackageManager,
): string {
  const baseCommand = `${dlxCommand} starwind@latest setup --yes`;

  return packageManager ? `${baseCommand} --package-manager ${packageManager}` : baseCommand;
}
