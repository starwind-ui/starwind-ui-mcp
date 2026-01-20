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
};

// Singleton instances
let docsCache = new DocsCache();
let rateLimiter = new RateLimiter(3);

/**
 * Reset cache and rate limiter state (for testing purposes)
 */
export function resetDocsToolState(): void {
  docsCache = new DocsCache();
  rateLimiter = new RateLimiter(3);
}

// Documentation URLs
const DOCS_URLS = {
  standard: "https://starwind.dev/llms.txt",
  full: "https://starwind.dev/llms-full.txt",
};

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
    const url = isFull ? DOCS_URLS.full : DOCS_URLS.standard;
    const cacheKey = isFull ? "docs_full" : "docs_standard";
    const cacheTtl = isFull ? CACHE_TTL.FULL : CACHE_TTL.STANDARD;

    // Check cache first
    let docsContent = docsCache.get(cacheKey);
    let source: "cache" | "network" = "cache";

    if (!docsContent) {
      // Not in cache, check rate limit
      if (!rateLimiter.canMakeCall()) {
        throw new Error(
          `Rate limit exceeded. Please try again in ${rateLimiter.getResetTimeSeconds()} seconds. (Limit: 3 requests per minute)`,
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
