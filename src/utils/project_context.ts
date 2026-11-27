import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";

import { isStarwindFramework, type StarwindFramework } from "./starwind_manifest.js";

/** Host kinds match the Starwind framework installation guide slugs. */
export type StarwindHost =
  | "astro"
  | "nextjs"
  | "react-router"
  | "tanstack-start"
  | "vite-react"
  | "laravel-inertia-vue"
  | "nuxt"
  | "quasar"
  | "vite-vue"
  | "sveltekit"
  | "vite-svelte";

export type StarwindIslandFramework = Exclude<StarwindFramework, "astro">;

export interface StarwindPackageDocs {
  packageName: string;
  packageVersion: string | null;
  docsDir: string;
  llmsTxt: string;
  readme: string | null;
}

export interface StarwindProjectContext {
  cwd: string;
  nodeVersion: string;
  packageJsonFound: boolean;
  detectedFramework: StarwindFramework | null;
  detectedHost: StarwindHost | null;
  astroIslandFrameworks: StarwindIslandFramework[];
  starwindConfigFound: boolean;
  configVersion: number | null;
  configVersionInvalid: boolean;
  configuredFramework: StarwindFramework | null;
  componentDir: string | null;
  componentDirs: Partial<Record<StarwindFramework, string>> | null;
  installedComponentCount: number | null;
  proRegistryConfigured: boolean;
  packageDocs: StarwindPackageDocs[];
}

export interface InspectStarwindProjectOptions {
  /** Read node_modules for installed package docs. Tools enable this only for an explicit cwd. */
  packageDocs?: boolean;
}

export const STARWIND_DOCS_PACKAGES = [
  "@starwind-ui/runtime",
  "@starwind-ui/astro",
  "@starwind-ui/react",
  "@starwind-ui/vue",
  "@starwind-ui/svelte",
] as const;

const ASTRO_CONFIG_FILES = [
  "astro.config.mjs",
  "astro.config.js",
  "astro.config.ts",
  "astro.config.mts",
  "astro.config.cjs",
  "astro.config.cts",
] as const;

const QUASAR_CONFIG_FILES = [
  "quasar.config.ts",
  "quasar.config.js",
  "quasar.config.mjs",
  "quasar.config.cjs",
] as const;

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mts",
  "vite.config.mjs",
] as const;

const MAIN_ENTRY_FILES = ["src/main.ts", "src/main.js"] as const;

const REACT_ROUTER_CONFIG_FILES = [
  "react-router.config.ts",
  "react-router.config.js",
  "react-router.config.mjs",
  "react-router.config.mts",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasProRegistryConfiguration(config: Record<string, unknown> | null): boolean {
  // setup intentionally writes a ${STARWIND_LICENSE_KEY} reference here; the secret lives in
  // .env.local, which project inspection does not read or expose.
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
    return asRecord(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return null;
  }
}

function getDependencies(packageJson: Record<string, unknown> | null): Record<string, unknown> {
  // Same precedence as the Starwind CLI host planner.
  return {
    ...(asRecord(packageJson?.peerDependencies) ?? {}),
    ...(asRecord(packageJson?.optionalDependencies) ?? {}),
    ...(asRecord(packageJson?.devDependencies) ?? {}),
    ...(asRecord(packageJson?.dependencies) ?? {}),
  };
}

function anyFile(cwd: string, files: readonly string[]): boolean {
  return files.some((file) => existsSync(resolve(cwd, file)));
}

interface HostDetection {
  framework: StarwindFramework | null;
  host: StarwindHost | null;
  islands: StarwindIslandFramework[];
}

/**
 * Mirrors the Starwind CLI host order with cheap package and file signals: Astro first, then a
 * Svelte host, then a Vue host, then a React host. Like the CLI, a Vite Svelte, SvelteKit, or
 * Vite Vue host replaces a React host only when its host check passes. A Next.js app that
 * declares Svelte for a widget stays React.
 */
function detectHost(cwd: string, deps: Record<string, unknown>): HostDetection {
  const has = (name: string) => Boolean(deps[name]);
  const file = (path: string) => existsSync(resolve(cwd, path));
  const hasViteConfig = anyFile(cwd, VITE_CONFIG_FILES);
  const hasMainEntry = anyFile(cwd, MAIN_ENTRY_FILES);

  if (has("astro") || anyFile(cwd, ASTRO_CONFIG_FILES)) {
    const islands: StarwindIslandFramework[] = [];
    if (has("@astrojs/react") || has("react") || has("react-dom")) islands.push("react");
    if (has("@astrojs/vue") || has("vue")) islands.push("vue");
    if (has("@astrojs/svelte") || has("svelte")) islands.push("svelte");
    return { framework: "astro", host: "astro", islands };
  }

  // Same signals as the CLI Svelte host check.
  const svelteHost: StarwindHost | null = has("@sveltejs/kit")
    ? "sveltekit"
    : has("svelte") || has("@sveltejs/vite-plugin-svelte") || has("@astrojs/svelte")
      ? "vite-svelte"
      : null;
  const svelteReady =
    svelteHost === "sveltekit"
      ? has("svelte") && has("vite") && hasViteConfig && file("src/routes") && file("src/app.html")
      : svelteHost === "vite-svelte" &&
        has("svelte") &&
        has("vite") &&
        has("@sveltejs/vite-plugin-svelte") &&
        hasViteConfig &&
        hasMainEntry &&
        file("src/App.svelte");
  if (svelteHost && svelteReady) return { framework: "svelte", host: svelteHost, islands: [] };

  const vueHost: StarwindHost | null =
    has("vue") && has("@inertiajs/vue3")
      ? "laravel-inertia-vue"
      : has("nuxt")
        ? "nuxt"
        : has("@quasar/app-vite") || anyFile(cwd, QUASAR_CONFIG_FILES)
          ? "quasar"
          : has("vue")
            ? "vite-vue"
            : null;
  const vueReady =
    vueHost === "vite-vue"
      ? has("@vitejs/plugin-vue") && hasViteConfig && hasMainEntry && file("src/App.vue")
      : vueHost !== null;
  if (vueHost && vueReady) return { framework: "vue", host: vueHost, islands: [] };

  if (has("react") || has("react-dom")) {
    const host: StarwindHost = has("next")
      ? "nextjs"
      : has("@tanstack/react-start")
        ? "tanstack-start"
        : has("@react-router/dev") || anyFile(cwd, REACT_ROUTER_CONFIG_FILES)
          ? "react-router"
          : "vite-react";
    return { framework: "react", host, islands: [] };
  }

  // Without a React host, an incomplete Svelte or Vue host still names its framework, as the CLI
  // reports that host with a setup diagnostic.
  if (svelteHost) return { framework: "svelte", host: svelteHost, islands: [] };
  if (vueHost) return { framework: "vue", host: vueHost, islands: [] };
  return { framework: null, host: null, islands: [] };
}

function readComponentDirs(
  config: Record<string, unknown> | null,
): Partial<Record<StarwindFramework, string>> | null {
  const dirs = asRecord(config?.componentDirs);
  if (!dirs) return null;
  const entries = Object.entries(dirs).filter(
    (entry): entry is [StarwindFramework, string] =>
      isStarwindFramework(entry[0]) && typeof entry[1] === "string" && entry[1].length > 0,
  );
  return entries.length ? Object.fromEntries(entries) : null;
}

/**
 * Finds an installed package the way Node resolves it: the nearest node_modules folder from cwd
 * up to the filesystem root. This covers packages hoisted to an npm, Yarn, or Bun workspace root.
 */
function findInstalledPackageDir(cwd: string, packageName: string): string | null {
  let dir = resolve(cwd);
  for (;;) {
    const candidate = resolve(dir, "node_modules", packageName);
    if (existsSync(resolve(candidate, "package.json"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Lists installed Starwind packages that ship version-matched docs (1.6.0 and newer). */
export function findStarwindPackageDocs(cwd: string): StarwindPackageDocs[] {
  return STARWIND_DOCS_PACKAGES.flatMap((packageName) => {
    const packageDir = findInstalledPackageDir(cwd, packageName);
    if (!packageDir) return [];
    const docsDir = resolve(packageDir, "docs");
    const llmsTxt = resolve(docsDir, "llms.txt");
    if (!existsSync(llmsTxt)) return [];
    const readme = resolve(docsDir, "README.md");
    const version = readJson(resolve(packageDir, "package.json"))?.version;
    return [
      {
        packageName,
        packageVersion: typeof version === "string" ? version : null,
        docsDir,
        llmsTxt,
        readme: existsSync(readme) ? readme : null,
      },
    ];
  });
}

export function inspectStarwindProject(
  cwd = process.cwd(),
  options: InspectStarwindProjectOptions = {},
): StarwindProjectContext {
  const packagePath = resolve(cwd, "package.json");
  const configPath = resolve(cwd, "starwind.config.json");
  const packageJson = existsSync(packagePath) ? readJson(packagePath) : null;
  const config = existsSync(configPath) ? readJson(configPath) : null;
  const detection = detectHost(cwd, getDependencies(packageJson));
  const configuredFramework = isStarwindFramework(config?.framework) ? config.framework : null;
  const components = config?.components;
  const hasConfigVersion = config !== null && "version" in config;
  const configVersionInvalid = hasConfigVersion && typeof config.version !== "number";
  const configVersion =
    typeof config?.version === "number" ? config.version : config && !hasConfigVersion ? 1 : null;

  return {
    cwd,
    nodeVersion: process.versions.node,
    packageJsonFound: packageJson !== null,
    detectedFramework: detection.framework,
    detectedHost: detection.host,
    astroIslandFrameworks: detection.islands,
    starwindConfigFound: config !== null,
    configVersion,
    configVersionInvalid,
    configuredFramework,
    componentDir: typeof config?.componentDir === "string" ? config.componentDir : null,
    componentDirs: readComponentDirs(config),
    installedComponentCount: Array.isArray(components) ? components.length : null,
    proRegistryConfigured: hasProRegistryConfiguration(config),
    packageDocs: options.packageDocs ? findStarwindPackageDocs(cwd) : [],
  };
}

function stripPrefix(value: string, prefix: string): string | null {
  return value.startsWith(prefix) ? value.slice(prefix.length) : null;
}

function getSvelteKitMajor(cwd: string): number | null {
  const range = getDependencies(readJson(resolve(cwd, "package.json")))["@sveltejs/kit"];
  const match = typeof range === "string" ? range.match(/(\d+)/) : null;
  return match ? Number(match[1]) : null;
}

/**
 * Returns the import path for a styled component in this project, or null when the project does
 * not show its host or component directory. Paths follow the Starwind framework install guides.
 */
export function getProjectStyledImportPath(
  project: StarwindProjectContext,
  framework: StarwindFramework | null | undefined,
  name: string,
): string | null {
  const target = framework ?? project.configuredFramework ?? project.detectedFramework;
  const configured = (target && project.componentDirs?.[target]) || null;
  const dir = (configured ?? project.componentDir)?.replace(/^\.\//, "").replace(/\/$/, "");

  if (project.detectedHost === "nuxt" && target === "vue") {
    const base = dir ? (stripPrefix(dir, "app/") ?? dir) : "components/starwind";
    return `~/${base}/${name}`;
  }
  if (project.detectedHost === "sveltekit" && target === "svelte") {
    const rest = stripPrefix(dir ?? "src/lib/starwind", "src/lib/");
    if (rest === null) return null;
    return getSvelteKitMajor(project.cwd) === 3
      ? `#lib/${rest}/${name}/index.js`
      : `$lib/${rest}/${name}`;
  }
  if (project.detectedHost === "quasar" && target === "vue") {
    return `${dir ?? "src/components/starwind"}/${name}`;
  }
  if (project.detectedHost === "laravel-inertia-vue" && target === "vue") {
    const rest = stripPrefix(dir ?? "resources/js/components/starwind", "resources/js/");
    return rest === null ? null : `@/${rest}/${name}`;
  }
  if (project.detectedHost === "astro" && target && target !== "astro" && !configured) {
    return project.astroIslandFrameworks.includes(target)
      ? `@/components/starwind-${target}/${name}`
      : null;
  }
  const rest = dir ? stripPrefix(dir, "src/") : null;
  return rest === null ? null : `@/${rest}/${name}`;
}
