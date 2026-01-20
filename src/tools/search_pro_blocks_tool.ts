/**
 * Search Starwind Pro Blocks Tool
 * Searches and filters Starwind Pro blocks from the manifest
 */

/**
 * Manifest block structure from pro.starwind.dev
 */
interface ManifestBlock {
  id: string;
  name: string;
  description: string;
  categories: string[];
  keywords: string[];
  plan: "free" | "pro";
  installCommand: string;
  previewUrl: string;
}

/**
 * Full manifest structure
 */
interface Manifest {
  $schema: string;
  name: string;
  version: string;
  generatedAt: string;
  baseUrl: string;
  totalBlocks: number;
  categories: string[];
  blocks: ManifestBlock[];
}

/**
 * Interface for search tool arguments
 */
export interface SearchProBlocksArgs {
  /** Search query to match against name, description, and keywords */
  query?: string;
  /** Filter by category */
  category?: string;
  /** Filter by plan type */
  plan?: "free" | "pro";
  /** Maximum results to return (default: 10) */
  limit?: number;
}

/**
 * Cache for manifest data
 */
interface ManifestCache {
  data: Manifest;
  timestamp: number;
  expiresAt: number;
}

let manifestCache: ManifestCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const MANIFEST_URL = "https://pro.starwind.dev/r/manifest.json";

/**
 * Rate limiter for manifest requests
 */
class RateLimiter {
  private calls: number[] = [];
  private readonly maxCalls: number;
  private readonly windowMs: number;

  constructor(maxCalls: number = 3, windowMs: number = 60 * 1000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  canMakeCall(): boolean {
    this.cleanup();
    return this.calls.length < this.maxCalls;
  }

  recordCall(): void {
    this.calls.push(Date.now());
  }

  getResetTimeSeconds(): number {
    this.cleanup();
    if (this.calls.length === 0) return 0;
    const oldestCall = this.calls[0];
    const resetTime = oldestCall + this.windowMs;
    return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
  }

  private cleanup(): void {
    const now = Date.now();
    this.calls = this.calls.filter((time) => now - time < this.windowMs);
  }
}

let rateLimiter = new RateLimiter(3);

/**
 * Reset tool state (for testing purposes)
 */
export function resetProBlocksToolState(): void {
  manifestCache = null;
  rateLimiter = new RateLimiter(3);
}

/**
 * Fetch manifest from pro.starwind.dev with caching
 */
async function getManifest(): Promise<{ manifest: Manifest; source: "cache" | "network" }> {
  // Check cache first
  if (manifestCache && Date.now() < manifestCache.expiresAt) {
    return { manifest: manifestCache.data, source: "cache" };
  }

  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${rateLimiter.getResetTimeSeconds()} seconds. (Limit: 3 requests per minute)`,
    );
  }

  // Fetch from network
  rateLimiter.recordCall();

  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
    }

    const manifest = (await response.json()) as Manifest;

    // Update cache
    manifestCache = {
      data: manifest,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
    };

    return { manifest, source: "network" };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error fetching Starwind Pro manifest: ${message}`);
  }
}

/**
 * Score a block against a search query
 */
function scoreMatch(block: ManifestBlock, query: string): number {
  const q = query.toLowerCase();
  let score = 0;

  // Exact name match (highest priority)
  if (block.name.toLowerCase() === q) score += 100;
  else if (block.name.toLowerCase().includes(q)) score += 50;

  // ID match
  if (block.id.toLowerCase().includes(q)) score += 40;

  // Keyword exact match
  if (block.keywords.some((k) => k.toLowerCase() === q)) score += 30;

  // Keyword partial match
  if (block.keywords.some((k) => k.toLowerCase().includes(q))) score += 20;

  // Description match
  if (block.description.toLowerCase().includes(q)) score += 10;

  // Category match
  if (block.categories.some((c) => c.toLowerCase().includes(q))) score += 15;

  return score;
}

/**
 * Format cache age as human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Search Pro Blocks tool definition
 */
export const searchProBlocksTool = {
  name: "search_starwind_pro_blocks",
  description:
    "Searches Starwind Pro blocks by query, category, or plan type. Returns matching blocks with install commands. Use this to find pre-built UI blocks like heroes, footers, pricing tables, etc. IMPORTANT: Pro blocks require the project to be initialized with 'starwind@latest init --defaults --pro' before they can be added.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Search query to match against block name, description, and keywords (e.g., 'pricing', 'hero dark', 'footer minimal').",
      },
      category: {
        type: "string",
        description:
          "Filter by category. Available categories include: hero, footer, pricing, navigation, testimonial, faq, feature, cta, blog, team, contact, form, authentication, etc.",
      },
      plan: {
        type: "string",
        enum: ["free", "pro"],
        description: "Filter by plan type. 'free' blocks are available to all, 'pro' requires a subscription.",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return. Default: 10, Max: 50.",
      },
    },
  },
  handler: async (args: SearchProBlocksArgs) => {
    const { query, category, plan, limit = 10 } = args;

    // Validate that at least one filter is provided
    if (!query && !category && !plan) {
      // Return overview with categories when no filters provided
      const { manifest, source } = await getManifest();

      return {
        message:
          "No search criteria provided. Here are the available categories. Use query, category, or plan to search.",
        availableCategories: manifest.categories,
        totalBlocks: manifest.totalBlocks,
        source,
        hint: "Try searching with a query like 'hero dark' or filter by category like 'pricing'.",
        proRequirements: {
          important:
            "Starwind Pro blocks REQUIRE the project to be initialized with --pro flag before blocks can be added.",
          initCommand: "pnpm dlx starwind@latest init --defaults --pro",
          note: "If the project was initialized without --pro, Pro blocks will fail to install.",
        },
      };
    }

    // Fetch manifest
    const { manifest, source } = await getManifest();

    // Start with all blocks
    let results = [...manifest.blocks];

    // Apply category filter
    if (category) {
      const categoryLower = category.toLowerCase();
      results = results.filter((block) =>
        block.categories.some((c) => c.toLowerCase() === categoryLower),
      );
    }

    // Apply plan filter
    if (plan) {
      results = results.filter((block) => block.plan === plan);
    }

    // Apply search query with scoring
    if (query) {
      const scored = results
        .map((block) => ({ block, score: scoreMatch(block, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);

      results = scored.map(({ block }) => block);
    }

    // Apply limit (max 50)
    const effectiveLimit = Math.min(Math.max(1, limit), 50);
    const totalMatches = results.length;
    results = results.slice(0, effectiveLimit);

    // Build response
    const response: Record<string, unknown> = {
      query: query || null,
      filters: {
        category: category || null,
        plan: plan || null,
      },
      totalMatches,
      resultsReturned: results.length,
      blocks: results.map((block) => ({
        id: block.id,
        name: block.name,
        description: block.description,
        categories: block.categories,
        plan: block.plan,
        installCommand: block.installCommand + " --yes",
        previewUrl: `${manifest.baseUrl}${block.previewUrl}`,
      })),
      availableCategories: manifest.categories,
      source,
    };

    // Add cache info if from cache
    if (source === "cache" && manifestCache) {
      const age = Date.now() - manifestCache.timestamp;
      const remainingTtl = manifestCache.expiresAt - Date.now();
      response.cacheInfo = {
        age: formatDuration(age),
        remainingTtl: formatDuration(remainingTtl),
      };
    }

    // Add helpful message if no results
    if (results.length === 0) {
      response.message = `No blocks found matching your criteria. Try a different query or browse available categories.`;
      response.hint = `Available categories: ${manifest.categories.slice(0, 10).join(", ")}${manifest.categories.length > 10 ? "..." : ""}`;
    }

    // ALWAYS include Pro initialization requirements
    response.proRequirements = {
      important:
        "Starwind Pro blocks REQUIRE the project to be initialized with --pro flag before blocks can be added.",
      initCommand: "pnpm dlx starwind@latest init --defaults --pro",
      note: "If the project was initialized without --pro, Pro blocks will fail to install. Re-run init with --pro to fix.",
      starwindAddTip:
        "When using starwind_add tool with Pro blocks, set init=true and pro=true to generate the correct init command.",
    };

    return response;
  },
};
