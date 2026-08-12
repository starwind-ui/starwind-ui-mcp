import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

export interface StarwindProjectContext {
  cwd: string;
  nodeVersion: string;
  packageJsonFound: boolean;
  detectedFramework: "astro" | "react" | null;
  starwindConfigFound: boolean;
  configVersion: number | null;
  configuredFramework: "astro" | "react" | null;
  componentDir: string | null;
  installedComponentCount: number | null;
  proRegistryConfigured: boolean;
}

const ASTRO_CONFIG_FILES = [
  "astro.config.mjs",
  "astro.config.js",
  "astro.config.ts",
  "astro.config.mts",
  "astro.config.cjs",
  "astro.config.cts",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasProRegistryConfiguration(config: Record<string, unknown> | null): boolean {
  const pro = asRecord(config?.pro);
  const registry = asRecord(pro?.registry);
  const headers = asRecord(registry?.headers);
  return Object.entries(headers ?? {}).some(
    ([name, value]) =>
      name.toLowerCase() === "authorization" &&
      typeof value === "string" &&
      value.trim().length > 0,
  );
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function inspectStarwindProject(cwd = process.cwd()): StarwindProjectContext {
  const packagePath = resolve(cwd, "package.json");
  const configPath = resolve(cwd, "starwind.config.json");
  const packageJson = existsSync(packagePath) ? readJson(packagePath) : null;
  const config = existsSync(configPath) ? readJson(configPath) : null;
  const dependencies = {
    ...((packageJson?.dependencies as Record<string, unknown> | undefined) ?? {}),
    ...((packageJson?.devDependencies as Record<string, unknown> | undefined) ?? {}),
  };
  const hasAstroConfig = ASTRO_CONFIG_FILES.some((file) => existsSync(resolve(cwd, file)));
  const detectedFramework =
    dependencies.astro || hasAstroConfig
      ? "astro"
      : dependencies.react || dependencies["react-dom"]
        ? "react"
        : null;
  const configuredFramework =
    config?.framework === "astro" || config?.framework === "react" ? config.framework : null;
  const components = config?.components;

  return {
    cwd,
    nodeVersion: process.versions.node,
    packageJsonFound: packageJson !== null,
    detectedFramework,
    starwindConfigFound: config !== null,
    configVersion: typeof config?.version === "number" ? config.version : config ? 1 : null,
    configuredFramework,
    componentDir: typeof config?.componentDir === "string" ? config.componentDir : null,
    installedComponentCount: Array.isArray(components) ? components.length : null,
    proRegistryConfigured: hasProRegistryConfiguration(config),
  };
}
