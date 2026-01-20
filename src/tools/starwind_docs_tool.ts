/**
 * Starwind Docs Tool
 * Fetches live documentation from starwind.dev for AI consumption
 */

/**
 * Interface for starwind docs tool arguments
 */
export interface StarwindDocsArgs {
  /** Optional topic to filter documentation (e.g., "button", "theming", "installation") */
  topic?: string;
  /** Whether to fetch the full documentation (defaults to false for concise version) */
  full?: boolean;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Simple in-memory cache for documentation
 */
class DocsCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: string, ttlSeconds: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000,
    });
  }

  getInfo(key: string): { age: number; remainingTtl: number } | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    const now = Date.now();
    return {
      age: Math.floor((now - entry.timestamp) / 1000),
      remainingTtl: Math.max(0, Math.floor((entry.expiresAt - now) / 1000)),
    };
  }
}

/**
 * Rate limiter to prevent excessive requests
 */
class RateLimiter {
  private lastCallTimes: number[] = [];
  private maxCallsPerMinute: number;

  constructor(maxCallsPerMinute: number = 3) {
    this.maxCallsPerMinute = maxCallsPerMinute;
  }

  canMakeCall(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    this.lastCallTimes = this.lastCallTimes.filter((time) => time > oneMinuteAgo);
    return this.lastCallTimes.length < this.maxCallsPerMinute;
  }

  recordCall(): void {
    this.lastCallTimes.push(Date.now());
  }

  getRemainingCalls(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    this.lastCallTimes = this.lastCallTimes.filter((time) => time > oneMinuteAgo);
    return Math.max(0, this.maxCallsPerMinute - this.lastCallTimes.length);
  }

  getResetTimeSeconds(): number {
    if (this.lastCallTimes.length === 0) return 0;
    const oldest = Math.min(...this.lastCallTimes);
    return Math.max(0, Math.ceil(60 - (Date.now() - oldest) / 1000));
  }
}

// Cache TTL values in seconds
const CACHE_TTL = {
  STANDARD: 60 * 60, // 1 hour
  FULL: 60 * 60 * 3, // 3 hours
  PAGE: 60 * 60 * 2, // 2 hours for specific pages
};

// Singleton instances
let docsCache = new DocsCache();
let rateLimiter = new RateLimiter(10); // Increased for page fetches

/**
 * Reset cache and rate limiter state (for testing purposes)
 */
export function resetDocsToolState(): void {
  docsCache = new DocsCache();
  rateLimiter = new RateLimiter(10);
}

// Documentation URLs
const DOCS_URLS = {
  standard: "https://starwind.dev/llms.txt",
  full: "https://starwind.dev/llms-full.txt",
  base: "https://starwind.dev",
};

// Known components (fetched from llms.txt dynamically, with fallback)
const KNOWN_COMPONENTS = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "calendar",
  "card",
  "carousel",
  "checkbox",
  "collapsible",
  "combobox",
  "command",
  "context-menu",
  "dialog",
  "drawer",
  "dropdown-menu",
  "form",
  "hover-card",
  "input",
  "input-otp",
  "label",
  "menubar",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "sonner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toggle",
  "toggle-group",
  "tooltip",
];

// Known doc pages that aren't components
const DOC_PAGE_PATHS: Record<string, string> = {
  installation: "/docs/getting-started/installation/",
  "getting-started": "/docs/getting-started/installation/",
  theming: "/docs/getting-started/theming/",
  themes: "/docs/getting-started/themes/",
  "dark-mode": "/docs/getting-started/dark-mode/",
  darkmode: "/docs/getting-started/dark-mode/",
  typography: "/docs/getting-started/typography/",
  cli: "/docs/getting-started/cli/",
  about: "/docs/getting-started/",
  introduction: "/docs/getting-started/",
  ai: "/docs/getting-started/ai/",
  "ai-integration": "/docs/getting-started/ai/",
};

/**
 * Build the markdown URL for a topic
 */
function getMarkdownUrl(topic: string): string | null {
  const normalized = topic.toLowerCase().trim();

  // Check if it's a known doc page
  if (DOC_PAGE_PATHS[normalized]) {
    return `${DOCS_URLS.base}${DOC_PAGE_PATHS[normalized]}markdown.md`;
  }

  // Check if it's a known component
  if (KNOWN_COMPONENTS.includes(normalized)) {
    return `${DOCS_URLS.base}/docs/components/${normalized}/markdown.md`;
  }

  // Try as a component anyway (might be a new component not in our list)
  return `${DOCS_URLS.base}/docs/components/${normalized}/markdown.md`;
}

/**
 * Fetch a specific documentation page
 */
async function fetchDocPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Starwind Docs tool definition
 */
export const starwindDocsTool = {
  name: "starwind_docs",
  description:
    "Fetches live Starwind UI documentation from starwind.dev. Use this to get up-to-date component docs, installation guides, theming info, and usage examples. The documentation is optimized for AI consumption.",
  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description:
          "Optional topic to filter documentation (e.g., 'button', 'accordion', 'theming', 'installation'). Leave empty to get all documentation.",
      },
      full: {
        type: "boolean",
        description:
          "Whether to fetch the full documentation with complete code examples. Defaults to false for a more concise version.",
      },
    },
    required: [],
  },
  handler: async (args: StarwindDocsArgs = {}) => {
    const isFull = args.full === true;

    // If a topic is provided, try to fetch the specific markdown page first
    if (args.topic) {
      const topic = args.topic.toLowerCase().trim();
      const markdownUrl = getMarkdownUrl(topic);

      if (markdownUrl) {
        const pageCacheKey = `page_${topic}`;

        // Check cache for this specific page
        let pageContent = docsCache.get(pageCacheKey);
        let source: "cache" | "network" | "fallback" = "cache";

        if (!pageContent) {
          // Check rate limit
          if (!rateLimiter.canMakeCall()) {
            throw new Error(
              `Rate limit exceeded. Please try again in ${rateLimiter.getResetTimeSeconds()} seconds. (Limit: 10 requests per minute)`,
            );
          }

          rateLimiter.recordCall();
          const fetchedContent = await fetchDocPage(markdownUrl);

          if (fetchedContent) {
            pageContent = fetchedContent;
            docsCache.set(pageCacheKey, pageContent, CACHE_TTL.PAGE);
            source = "network";

            const cacheInfo = docsCache.getInfo(pageCacheKey);

            return {
              documentation: pageContent,
              source,
              url: markdownUrl,
              topic: args.topic,
              full: true, // Specific pages are always full
              pageType: KNOWN_COMPONENTS.includes(topic) ? "component" : "guide",
              cacheInfo: cacheInfo
                ? {
                    age: `${cacheInfo.age} seconds`,
                    remainingTtl: `${cacheInfo.remainingTtl} seconds`,
                  }
                : null,
              rateLimitInfo: {
                requestsRemaining: rateLimiter.getRemainingCalls(),
                resetAfter: `${rateLimiter.getResetTimeSeconds()} seconds`,
              },
            };
          }
          // Page fetch failed, fall through to llms.txt fallback
          source = "fallback";
        } else {
          // Found in cache
          const cacheInfo = docsCache.getInfo(pageCacheKey);

          return {
            documentation: pageContent,
            source,
            url: markdownUrl,
            topic: args.topic,
            full: true,
            pageType: KNOWN_COMPONENTS.includes(topic) ? "component" : "guide",
            cacheInfo: cacheInfo
              ? {
                  age: `${cacheInfo.age} seconds`,
                  remainingTtl: `${cacheInfo.remainingTtl} seconds`,
                }
              : null,
            rateLimitInfo: {
              requestsRemaining: rateLimiter.getRemainingCalls(),
              resetAfter: `${rateLimiter.getResetTimeSeconds()} seconds`,
            },
          };
        }
      }
    }

    // Fallback: fetch llms.txt and filter by topic
    const url = isFull ? DOCS_URLS.full : DOCS_URLS.standard;
    const cacheKey = isFull ? "docs_full" : "docs_standard";
    const cacheTtl = isFull ? CACHE_TTL.FULL : CACHE_TTL.STANDARD;

    // Check cache first
    let docsContent = docsCache.get(cacheKey);
    let source: "cache" | "network" | "fallback" = "cache";

    if (!docsContent) {
      // Not in cache, check rate limit
      if (!rateLimiter.canMakeCall()) {
        throw new Error(
          `Rate limit exceeded. Please try again in ${rateLimiter.getResetTimeSeconds()} seconds. (Limit: 10 requests per minute)`,
        );
      }

      // Fetch from network
      rateLimiter.recordCall();

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch docs: ${response.status} ${response.statusText}`);
        }
        docsContent = await response.text();
        docsCache.set(cacheKey, docsContent, cacheTtl);
        source = "network";
      } catch (error: any) {
        throw new Error(`Error fetching Starwind documentation: ${error.message}`);
      }
    }

    // Filter by topic if provided
    let filteredContent = docsContent;
    if (args.topic) {
      const topic = args.topic.toLowerCase().trim();
      const lines = docsContent.split("\n");
      const filteredLines: string[] = [];
      let inRelevantSection = false;
      let sectionDepth = 0;

      for (const line of lines) {
        // Check for section headers (# or ##)
        const headerMatch = line.match(/^(#{1,3})\s+(.+)/);
        if (headerMatch) {
          const headerLevel = headerMatch[1].length;
          const headerText = headerMatch[2].toLowerCase();

          // Check if this header matches our topic
          if (headerText.includes(topic)) {
            inRelevantSection = true;
            sectionDepth = headerLevel;
            filteredLines.push(line);
          } else if (inRelevantSection && headerLevel <= sectionDepth) {
            // We've hit a same-level or higher header, end the section
            inRelevantSection = false;
          } else if (inRelevantSection) {
            filteredLines.push(line);
          }
        } else if (inRelevantSection) {
          filteredLines.push(line);
        }
      }

      if (filteredLines.length > 0) {
        filteredContent = filteredLines.join("\n");
      } else {
        // No exact section match, try simple text search (only lines containing the topic)
        const relevantLines = lines.filter((line) => line.toLowerCase().includes(topic));
        if (relevantLines.length > 0) {
          filteredContent = relevantLines.join("\n");
        } else {
          filteredContent = `No documentation found for topic: "${args.topic}". Try searching for: button, accordion, dialog, card, theming, installation, or use without a topic filter to see all available documentation.`;
        }
      }

      // Mark as fallback if we tried a specific page but it failed
      source = "fallback";
    }

    const cacheInfo = docsCache.getInfo(cacheKey);

    return {
      documentation: filteredContent,
      source,
      url,
      topic: args.topic || null,
      full: isFull,
      cacheInfo: cacheInfo
        ? {
            age: `${cacheInfo.age} seconds`,
            remainingTtl: `${cacheInfo.remainingTtl} seconds`,
          }
        : null,
      rateLimitInfo: {
        requestsRemaining: rateLimiter.getRemainingCalls(),
        resetAfter: `${rateLimiter.getResetTimeSeconds()} seconds`,
      },
    };
  },
};
