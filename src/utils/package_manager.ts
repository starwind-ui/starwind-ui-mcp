import { existsSync } from "fs";
import { resolve } from "path";

/**
 * Represents a supported package manager
 */
export type PackageManager = "npm" | "yarn" | "pnpm";

/**
 * Configuration options for package manager detection
 */
export interface PackageManagerOptions {
  /** Root directory to check for lock files (defaults to process.cwd()) */
  cwd?: string;
  /** Default package manager to use if detection fails (defaults to 'npm') */
  defaultManager?: PackageManager;
}

/**
 * Contains information about the detected package manager
 */
export interface PackageManagerInfo {
  /** The name of the detected package manager */
  name: PackageManager;
  /** The command to use for installing packages */
  installCmd: string;
  /** The command to use for adding a package */
  addCmd: string;
  /** The command to use for removing a package */
  removeCmd: string;
  /** The command to use for running scripts */
  runCmd: string;
}

/**
 * Map of package managers to their lock files
 */
const LOCK_FILES: Record<PackageManager, string> = {
  npm: "package-lock.json",
  yarn: "yarn.lock",
  pnpm: "pnpm-lock.yaml",
};

/**
 * Map of package managers to their command information
 */
const PACKAGE_MANAGER_COMMANDS: Record<PackageManager, Omit<PackageManagerInfo, "name">> = {
  npm: {
    installCmd: "npm install",
    addCmd: "npm install",
    removeCmd: "npm uninstall",
    runCmd: "npm run",
  },
  yarn: {
    installCmd: "yarn",
    addCmd: "yarn add",
    removeCmd: "yarn remove",
    runCmd: "yarn",
  },
  pnpm: {
    installCmd: "pnpm install",
    addCmd: "pnpm add",
    removeCmd: "pnpm remove",
    runCmd: "pnpm",
  },
};

/**
 * Detects the package manager used in the project
 *
 * @param options - Configuration options for detection
 * @returns Information about the detected package manager
 *
 * @example
 * ```ts
 * // Get the user's package manager with default options
 * const pm = detectPackageManager();
 * console.log(`Using ${pm.name} with install command: ${pm.installCmd}`);
 *
 * // Specify custom options
 * const pm2 = detectPackageManager({
 *   cwd: '/path/to/project',
 *   defaultManager: 'yarn',
 * });
 * ```
 */
export function detectPackageManager(options: PackageManagerOptions = {}): PackageManagerInfo {
  const { cwd = process.cwd(), defaultManager = "npm" } = options;

  // Determine priorities for checking lock files
  const packageManagers: PackageManager[] = ["pnpm", "yarn", "npm"];

  // Detected package managers
  const detected: PackageManager[] = [];

  // Check for each lock file
  for (const pm of packageManagers) {
    const lockFile = LOCK_FILES[pm];
    const lockFilePath = resolve(cwd, lockFile);

    console.log(`Checking for ${lockFile} at ${lockFilePath}`);

    if (existsSync(lockFilePath)) {
      detected.push(pm);
      // Found a lock file, no need to check others
      break;
    }
  }

  // Return the first detected package manager or default
  const packageManager = detected.length > 0 ? detected[0] : defaultManager;

  return {
    name: packageManager,
    ...PACKAGE_MANAGER_COMMANDS[packageManager],
  };
}

/**
 * Gets the command for the given package manager and action
 *
 * @param action - The action to perform ('install', 'add', 'remove', or 'run')
 * @param options - Package manager detection options
 * @returns The command string for the specified action
 *
 * @example
 * ```ts
 * // Get install command
 * const installCmd = getPackageManagerCommand('install');
 *
 * // Get add command with custom options
 * const addCmd = getPackageManagerCommand('add', { defaultManager: 'yarn' });
 * ```
 */
export function getPackageManagerCommand(
  action: "install" | "add" | "remove" | "run",
  options: PackageManagerOptions = {},
): string {
  const pmInfo = detectPackageManager(options);

  switch (action) {
    case "install":
      return pmInfo.installCmd;
    case "add":
      return pmInfo.addCmd;
    case "remove":
      return pmInfo.removeCmd;
    case "run":
      return pmInfo.runCmd;
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Gets the run command for a script with the detected package manager
 *
 * @param scriptName - The name of the script to run
 * @param options - Package manager detection options
 * @returns The full command to run the script
 *
 * @example
 * ```ts
 * // Get command to run 'build' script
 * const buildCmd = getRunCommand('build');
 * // Results in 'npm run build', 'yarn build', or 'pnpm build'
 * ```
 */
export function getRunCommand(scriptName: string, options: PackageManagerOptions = {}): string {
  const pmInfo = detectPackageManager(options);

  switch (pmInfo.name) {
    case "npm":
      return `${pmInfo.runCmd} ${scriptName}`;
    case "yarn":
      return `${pmInfo.runCmd} ${scriptName}`;
    case "pnpm":
      return `${pmInfo.runCmd} ${scriptName}`;
    default:
      return `${pmInfo.runCmd} ${scriptName}`;
  }
}
