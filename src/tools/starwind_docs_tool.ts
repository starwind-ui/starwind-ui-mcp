import { z } from "zod";

import {
  getStarwindManifest,
  resetStarwindManifestCache,
  type StarwindMetadataSource,
} from "../utils/starwind_manifest.js";

export interface StarwindDocsArgs {
  topic?: string;
  surface?: "auto" | "component" | "primitive" | "guide" | "runtime";
  full?: boolean;
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

async function resolvePage(topic: string, surface: NonNullable<StarwindDocsArgs["surface"]>) {
  const normalized = topic.toLowerCase().trim();
  const alias = GUIDE_ALIASES[normalized] ?? normalized;
  const { manifest, source } = await getStarwindManifest();
  const component = manifest.components.find((item) =>
    [item.name, item.title, ...item.aliases].some((value) => value.toLowerCase() === normalized),
  );
  const primitive = manifest.layeredDocs.primitives.find((item) =>
    [item.id, item.title, item.label, ...item.aliases].some(
      (value) => value.toLowerCase() === normalized,
    ),
  );
  const guide = manifest.guides.find(
    (item) =>
      item.name.toLowerCase() === alias ||
      item.title.toLowerCase() === normalized ||
      normalizedSlug(item.docsUrl) === alias,
  );

  if (surface === "runtime" || (surface === "auto" && normalized === "runtime")) {
    return { url: DOCS_URLS.runtimeMarkdown, pageType: "runtime" as const, source };
  }
  if ((surface === "component" || surface === "auto") && component) {
    return { url: component.markdownUrl, pageType: "component" as const, source };
  }
  if ((surface === "primitive" || surface === "auto") && primitive) {
    return { url: primitive.markdownUrl, pageType: "primitive" as const, source };
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
    };
  }
  return null;
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
    "Fetches current Starwind UI v3 documentation across styled components, primitives, Runtime, migration, and Astro or React framework guides.",
  inputSchema: {
    topic: z.string().optional(),
    surface: z.enum(["auto", "component", "primitive", "guide", "runtime"]).optional(),
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
    if (topic) {
      const page = await resolvePage(topic, surface);
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
      note: topic
        ? "No exact manifest page resolved; this is a filtered aggregate result."
        : undefined,
      cacheInfo: docsCache.info(key),
      rateLimitInfo: telemetry(),
    };
  },
};
