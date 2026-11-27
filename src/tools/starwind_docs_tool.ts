import { existsSync } from "fs";
import { resolve } from "path";
import { z } from "zod";

import {
  findStarwindPackageDocs,
  inspectStarwindProject,
  type StarwindPackageDocs,
} from "../utils/project_context.js";
import {
  getStarwindManifest,
  isStarwindFramework,
  resetStarwindManifestCache,
  STARWIND_FRAMEWORKS,
  type StarwindMetadataSource,
} from "../utils/starwind_manifest.js";

export interface StarwindDocsArgs {
  topic?: string;
  surface?: "auto" | "component" | "primitive" | "guide" | "runtime";
  full?: boolean;
  cwd?: string;
}

export interface StarwindInstalledDocs {
  path: string;
  packageName: string;
  packageVersion: string | null;
  note: string;
}

export interface StarwindDocsResult {
  documentation: string;
  resultType: "page" | "filtered" | "full";
  url: string;
  topic: string | null;
  surface: StarwindDocsArgs["surface"];
  full: boolean;
  pageType?: "component" | "primitive" | "guide" | "runtime";
  metadataSource?: StarwindMetadataSource;
  installedDocs?: StarwindInstalledDocs;
  note?: string;
  cacheInfo: { age: string; remainingTtl: string } | null;
  rateLimitInfo: { requestsRemaining: number; resetAfter: string };
}

interface CacheEntry {
  data: string;
  timestamp: number;
  expiresAt: number;
}

class DocsCache {
  private cache = new Map<string, CacheEntry>();

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: string, ttlSeconds: number): void {
    const timestamp = Date.now();
    this.cache.set(key, { data, timestamp, expiresAt: timestamp + ttlSeconds * 1000 });
  }

  info(key: string): { age: string; remainingTtl: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return {
      age: `${Math.floor((Date.now() - entry.timestamp) / 1000)} seconds`,
      remainingTtl: `${Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000))} seconds`,
    };
  }
}

class RateLimiter {
  private calls: number[] = [];
  constructor(private readonly maxCalls = 10) {}

  private prune(): void {
    this.calls = this.calls.filter((time) => time > Date.now() - 60_000);
  }

  record(): void {
    this.prune();
    if (this.calls.length >= this.maxCalls) {
      throw new Error(`Rate limit exceeded. Try again in ${this.resetSeconds()} seconds.`);
    }
    this.calls.push(Date.now());
  }

  remaining(): number {
    this.prune();
    return this.maxCalls - this.calls.length;
  }

  resetSeconds(): number {
    this.prune();
    return this.calls.length ? Math.max(0, Math.ceil(60 - (Date.now() - this.calls[0]) / 1000)) : 0;
  }
}

const DOCS_URLS = {
  concise: "https://starwind.dev/llms.txt",
  full: "https://starwind.dev/llms-full.txt",
  runtimeMarkdown: "https://starwind.dev/docs/runtime.md",
};
const GUIDE_ALIASES: Record<string, string> = {
  introduction: "getting-started",
  about: "getting-started",
  darkmode: "dark-mode",
  react: "vite-react",
  vite: "vite-react",
  next: "nextjs",
  "next.js": "nextjs",
  tanstack: "tanstack-start",
  vue: "vite-vue",
  "svelte-kit": "sveltekit",
  laravel: "laravel-inertia-vue",
  inertia: "laravel-inertia-vue",
};
const FETCH_TIMEOUT_MS = 5000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let docsCache = new DocsCache();
let rateLimiter = new RateLimiter();

export function resetDocsToolState(): void {
  docsCache = new DocsCache();
  rateLimiter = new RateLimiter();
  resetStarwindManifestCache();
}

async function fetchText(url: string): Promise<string | null> {
  rateLimiter.record();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizedSlug(url: string): string {
  return url.replace(/\/$/, "").split("/").pop()?.toLowerCase() ?? "";
}

function findByPriority<T>(
  items: T[],
  normalized: string,
  keys: ((item: T) => string[])[],
): T | undefined {
  for (const key of keys) {
    const match = items.find((item) =>
      key(item).some((value) => value.toLowerCase() === normalized),
    );
    if (match) return match;
  }
  return undefined;
}

async function resolvePage(topic: string, surface: NonNullable<StarwindDocsArgs["surface"]>) {
  const normalized = topic.toLowerCase().trim();
  const alias = GUIDE_ALIASES[normalized] ?? normalized;
  const { manifest, source } = await getStarwindManifest();
  // Exact names win over titles, and titles over aliases. Published aliases include shared part
  // names such as "Item" or "Label", so an alias match must not shadow a component's own name.
  const component = findByPriority(manifest.components, normalized, [
    (item) => [item.name],
    (item) => [item.title],
    (item) => item.aliases,
  ]);
  const primitive = findByPriority(manifest.layeredDocs.primitives, normalized, [
    (item) => [item.id],
    (item) => [item.title, item.label],
    (item) => item.aliases,
  ]);
  const guide = manifest.guides.find(
    (item) =>
      item.name.toLowerCase() === alias ||
      item.title.toLowerCase() === normalized ||
      normalizedSlug(item.docsUrl) === alias,
  );

  if (surface === "runtime" || (surface === "auto" && normalized === "runtime")) {
    return {
      url: DOCS_URLS.runtimeMarkdown,
      pageType: "runtime" as const,
      source,
      primitiveId: primitive?.id,
    };
  }
  // The published manifest lists framework names such as "astro" and "react" as aliases of every
  // styled component, so a framework or guide alias topic resolves to its guide first.
  if (
    surface === "auto" &&
    guide &&
    (isStarwindFramework(normalized) || Object.hasOwn(GUIDE_ALIASES, normalized))
  ) {
    return { url: guide.markdownUrl, pageType: "guide" as const, source };
  }
  if ((surface === "component" || surface === "auto") && component) {
    return { url: component.markdownUrl, pageType: "component" as const, source };
  }
  if ((surface === "primitive" || surface === "auto") && primitive) {
    return {
      url: primitive.markdownUrl,
      pageType: "primitive" as const,
      source,
      primitiveId: primitive.id,
    };
  }
  if ((surface === "guide" || surface === "auto") && guide) {
    return { url: guide.markdownUrl, pageType: "guide" as const, source };
  }
  if (surface === "component" && SLUG_PATTERN.test(normalized)) {
    return {
      url: `https://starwind.dev/docs/components/${normalized}.md`,
      pageType: "component" as const,
      source,
    };
  }
  if (surface === "primitive" && SLUG_PATTERN.test(normalized)) {
    return {
      url: `https://starwind.dev/docs/primitives/${normalized}.md`,
      pageType: "primitive" as const,
      source,
      primitiveId: normalized,
    };
  }
  return null;
}

function installedPage(
  docs: StarwindPackageDocs | undefined,
  relativePath: string,
): StarwindInstalledDocs | undefined {
  if (!docs) return undefined;
  const path = resolve(docs.docsDir, relativePath);
  if (!existsSync(path)) return undefined;
  const version = docs.packageVersion
    ? `${docs.packageName}@${docs.packageVersion}`
    : docs.packageName;
  return {
    path,
    packageName: docs.packageName,
    packageVersion: docs.packageVersion,
    note: `This page ships with the installed ${version} package and matches its version. Prefer it when it differs from the website page.`,
  };
}

/**
 * Finds the installed package page for a Primitive or Runtime topic. The project framework's
 * adapter package comes first, then the other adapter packages, then the Runtime controller page.
 */
function findInstalledDocs(
  cwd: string,
  pageType: "primitive" | "runtime",
  primitiveId: string | undefined,
): StarwindInstalledDocs | undefined {
  const packageDocs = findStarwindPackageDocs(cwd);
  if (!packageDocs.length) return undefined;
  const byPackage = (name: string) => packageDocs.find((docs) => docs.packageName === name);
  const id = primitiveId && SLUG_PATTERN.test(primitiveId) ? primitiveId : undefined;
  const runtimeDocs = byPackage("@starwind-ui/runtime");

  if (pageType === "runtime") {
    return (
      (id ? installedPage(runtimeDocs, `controllers/${id}.md`) : undefined) ??
      installedPage(runtimeDocs, "README.md")
    );
  }
  if (!id) return undefined;
  const project = inspectStarwindProject(cwd);
  const preferred = project.configuredFramework ?? project.detectedFramework;
  const frameworks = preferred
    ? [preferred, ...STARWIND_FRAMEWORKS.filter((framework) => framework !== preferred)]
    : [...STARWIND_FRAMEWORKS];
  for (const framework of frameworks) {
    const page = installedPage(byPackage(`@starwind-ui/${framework}`), `primitives/${id}.md`);
    if (page) return page;
  }
  return installedPage(runtimeDocs, `controllers/${id}.md`);
}

function filterAggregate(content: string, topic: string): string {
  const lines = content.split("\n");
  const matches: string[] = [];
  let collecting = false;
  let depth = 0;
  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.+)/);
    if (heading) {
      const level = heading[1].length;
      if (collecting && level <= depth) collecting = false;
      if (heading[2].toLowerCase().includes(topic)) {
        collecting = true;
        depth = level;
      }
    }
    if (collecting || line.toLowerCase().includes(topic)) matches.push(line);
  }
  return matches.join("\n").trim();
}

function telemetry() {
  return {
    requestsRemaining: rateLimiter.remaining(),
    resetAfter: `${rateLimiter.resetSeconds()} seconds`,
  };
}

export const starwindDocsTool = {
  name: "starwind_docs",
  description:
    "Fetches current Starwind UI v3 documentation across styled components, primitives, Runtime, migration, and Astro, React, Vue, or Svelte framework guides. With cwd, Primitive and Runtime topics also return installedDocs: the version-matched page from the installed @starwind-ui package.",
  inputSchema: {
    topic: z.string().optional(),
    surface: z.enum(["auto", "component", "primitive", "guide", "runtime"]).optional(),
    cwd: z
      .string()
      .optional()
      .describe(
        "Project directory. For a Primitive or Runtime topic, the result points to the installed package docs page when it exists.",
      ),
    full: z
      .boolean()
      .optional()
      .describe("Use the full aggregate reference when no exact page is found."),
  },
  outputSchema: {
    result: z.record(z.unknown()).describe("Structured Starwind documentation result."),
  },

  async handler(args: StarwindDocsArgs = {}): Promise<StarwindDocsResult> {
    const topic = args.topic?.trim().toLowerCase() || null;
    const surface = args.surface ?? "auto";
    let installedDocs: StarwindInstalledDocs | undefined;
    if (topic) {
      const page = await resolvePage(topic, surface);
      if (page && args.cwd && (page.pageType === "primitive" || page.pageType === "runtime")) {
        installedDocs = findInstalledDocs(args.cwd, page.pageType, page.primitiveId);
      }
      if (page) {
        const key = `page:${page.url}`;
        const cached = docsCache.get(key);
        const documentation = cached ?? (await fetchText(page.url));
        if (documentation) {
          if (!cached) docsCache.set(key, documentation, 2 * 60 * 60);
          return {
            documentation,
            resultType: "page",
            url: page.url,
            topic: args.topic ?? topic,
            surface,
            full: args.full === true,
            pageType: page.pageType,
            metadataSource: page.source,
            ...(installedDocs ? { installedDocs } : {}),
            cacheInfo: docsCache.info(key),
            rateLimitInfo: telemetry(),
          };
        }
      }
    }

    const url = args.full ? DOCS_URLS.full : DOCS_URLS.concise;
    const key = args.full ? "aggregate:full" : "aggregate:concise";
    const cached = docsCache.get(key);
    const aggregate = cached ?? (await fetchText(url));
    if (!aggregate) throw new Error(`Unable to fetch Starwind documentation from ${url}`);
    if (!cached) docsCache.set(key, aggregate, args.full ? 3 * 60 * 60 : 60 * 60);
    const filtered = topic ? filterAggregate(aggregate, topic) : aggregate;

    return {
      documentation:
        filtered ||
        `No documentation found for topic: "${topic}". Try a component, primitive, migration, runtime, or framework name.`,
      resultType: topic ? "filtered" : "full",
      url,
      topic: args.topic ?? null,
      surface,
      full: args.full === true,
      ...(installedDocs ? { installedDocs } : {}),
      note: topic
        ? "No exact manifest page resolved; this is a filtered aggregate result."
        : undefined,
      cacheInfo: docsCache.info(key),
      rateLimitInfo: telemetry(),
    };
  },
};
